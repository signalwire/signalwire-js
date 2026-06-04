import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeviceTokenManager, resolveExpiresAt, resolveExpireIn } from './DeviceTokenManager';
import { DeviceTokenError, TokenRefreshError } from '../core/errors';
import {
  DEVICE_TOKEN_ENDPOINT,
  DEVICE_REFRESH_ENDPOINT,
  DEVICE_TOKEN_DEFAULT_EXPIRE_IN,
  DEVICE_TOKEN_REFRESH_BUFFER_MS,
  DEVICE_TOKEN_REFRESH_RETRY_BASE_MS
} from '../core/constants';

import type { CryptoController } from '../controllers/CryptoController';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { ClientSessionManager } from './ClientSessionManager';
import type { User } from '../core/entities/User';
import type { SATClaims, DeviceTokenResponse } from '../core/types/crypto.types';
import type { SDKCredential } from '../core/types/common.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockCryptoController(): CryptoController {
  return {
    createHttpProof: vi.fn().mockResolvedValue('mock-http-proof'),
    createRpcProof: vi.fn().mockResolvedValue('mock-rpc-proof'),
    initialized: true,
    init: vi.fn(),
    fingerprint: 'mock-fingerprint',
    destroy: vi.fn()
  } as unknown as CryptoController;
}

function createMockHTTP(
  tokenResponse: DeviceTokenResponse = { token: 'mock-client-bound-sat' }
): HTTPRequestController {
  return {
    request: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: JSON.stringify(tokenResponse)
    })
  } as unknown as HTTPRequestController;
}

function createMockSession(): ClientSessionManager {
  return {
    reauthenticate: vi.fn().mockResolvedValue(undefined),
    authenticated: true
  } as unknown as ClientSessionManager;
}

function createMockUser(satClaims?: SATClaims): User {
  return { satClaims } as unknown as User;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeviceTokenManager', () => {
  let dpop: ReturnType<typeof createMockCryptoController>;
  let http: ReturnType<typeof createMockHTTP>;
  let session: ReturnType<typeof createMockSession>;
  let errorHandler: ReturnType<typeof vi.fn>;
  let manager: DeviceTokenManager;
  let credential: SDKCredential;
  let getCredential: ReturnType<typeof vi.fn>;
  let updateCredential: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dpop = createMockCryptoController();
    http = createMockHTTP();
    session = createMockSession();
    errorHandler = vi.fn();
    credential = { token: 'original-sat', authorizationState: 'some-state' } as SDKCredential;
    getCredential = vi.fn(() => credential);
    manager = new DeviceTokenManager(dpop, http, errorHandler, getCredential);
    updateCredential = vi.fn();
  });

  afterEach(() => {
    manager.destroy();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // resolveExpiresAt()
  // =========================================================================

  describe('resolveExpiresAt()', () => {
    it('returns expires_at when present', () => {
      const data: DeviceTokenResponse = { token: 'tok', expires_at: 1234567890 };
      expect(resolveExpiresAt(data)).toBe(1234567890);
    });

    it('computes from expires_in when expires_at is absent', () => {
      const now = Math.floor(Date.now() / 1000);
      const data: DeviceTokenResponse = { token: 'tok', expires_in: 600 };
      const result = resolveExpiresAt(data);
      // Allow 1 second tolerance for execution time
      expect(result).toBeGreaterThanOrEqual(now + 599);
      expect(result).toBeLessThanOrEqual(now + 601);
    });

    it('prefers expires_at over expires_in', () => {
      const data: DeviceTokenResponse = { token: 'tok', expires_at: 9999, expires_in: 600 };
      expect(resolveExpiresAt(data)).toBe(9999);
    });

    it('falls back to default when neither expires_at nor expires_in present', () => {
      const now = Math.floor(Date.now() / 1000);
      const data: DeviceTokenResponse = { token: 'tok' };
      const result = resolveExpiresAt(data);
      expect(result).toBeGreaterThanOrEqual(now + DEVICE_TOKEN_DEFAULT_EXPIRE_IN - 1);
      expect(result).toBeLessThanOrEqual(now + DEVICE_TOKEN_DEFAULT_EXPIRE_IN + 1);
    });
  });

  // =========================================================================
  // resolveExpireIn()
  // =========================================================================

  describe('resolveExpireIn()', () => {
    it('returns expires_in when present', () => {
      const data: DeviceTokenResponse = { token: 'tok', expires_in: 60 };
      expect(resolveExpireIn(data)).toBe(60);
    });

    it('derives TTL from expires_at when expires_in is absent', () => {
      const now = Math.floor(Date.now() / 1000);
      const data: DeviceTokenResponse = { token: 'tok', expires_at: now + 90 };
      const result = resolveExpireIn(data);
      expect(result).toBeGreaterThanOrEqual(89);
      expect(result).toBeLessThanOrEqual(91);
    });

    it('prefers expires_in over expires_at', () => {
      const now = Math.floor(Date.now() / 1000);
      const data: DeviceTokenResponse = { token: 'tok', expires_in: 60, expires_at: now + 900 };
      expect(resolveExpireIn(data)).toBe(60);
    });

    it('falls back to default when neither field present', () => {
      const data: DeviceTokenResponse = { token: 'tok' };
      expect(resolveExpireIn(data)).toBe(DEVICE_TOKEN_DEFAULT_EXPIRE_IN);
    });

    it('returns minimum of 1 when expires_at is in the past', () => {
      const data: DeviceTokenResponse = { token: 'tok', expires_at: 1000 };
      expect(resolveExpireIn(data)).toBe(1);
    });
  });

  // =========================================================================
  // activate()
  //
  // NOTE: These tests verify the manager-side behavior in isolation. The
  // *seam* invariant — "if activate() declines, the developer-provided
  // refresh path remains armed in SignalWire" — lives at the SignalWire
  // layer because the manager has no visibility into it. See
  // `src/clients/SignalWire.refresh.test.ts` (issue #19074).
  // =========================================================================

  describe('activate()', () => {
    it('declines (no-scope) when satClaims is undefined — caller must keep developer refresh armed', async () => {
      const user = createMockUser(undefined);

      const result = await manager.activate(user, session, updateCredential);

      expect(result).toEqual({ activated: false, reason: 'no-scope' });
      expect(dpop.createHttpProof).not.toHaveBeenCalled();
      expect(session.reauthenticate).not.toHaveBeenCalled();
    });

    it('declines (no-scope) when satClaims has no sat:refresh scope', async () => {
      const user = createMockUser({ scope: ['other:scope'] });

      const result = await manager.activate(user, session, updateCredential);

      expect(result).toEqual({ activated: false, reason: 'no-scope' });
      expect(dpop.createHttpProof).not.toHaveBeenCalled();
      expect(session.reauthenticate).not.toHaveBeenCalled();
    });

    it('declines (no-scope) when satClaims.scope is undefined', async () => {
      const user = createMockUser({ scope: undefined });

      const result = await manager.activate(user, session, updateCredential);

      expect(result).toEqual({ activated: false, reason: 'no-scope' });
      expect(dpop.createHttpProof).not.toHaveBeenCalled();
    });

    it('immediate activation: obtains token, reauthenticates, updates credential, returns {activated: true}', async () => {
      const tokenResponse: DeviceTokenResponse = {
        token: 'client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + 900
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + 900
      });

      const result = await manager.activate(user, session, updateCredential);

      expect(result).toEqual({ activated: true });
      // Should have obtained a token and reauthenticated immediately
      expect(http.request).toHaveBeenCalledTimes(1);
      expect(session.reauthenticate).toHaveBeenCalledWith('client-bound-sat', 'mock-rpc-proof', {
        clientBound: true
      });
      expect(updateCredential).toHaveBeenCalledWith({ token: 'client-bound-sat' });

      // effectiveExpireIn should be set from the token response
      expect(manager.effectiveExpireIn).toBeGreaterThan(0);
    });

    it('declines (endpoint-failed) when obtainToken fails — caller must keep developer refresh armed', async () => {
      // obtainToken transient failure. The orchestrator's developer-provided
      // refresh must remain the active path, so activate() must NOT claim
      // ownership and must NOT seed the reactive pipeline with an unbound
      // token (which would 401-loop on /devices/refresh).
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        body: null
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + 900
      });

      const result = await manager.activate(user, session, updateCredential);

      expect(result).toEqual({ activated: false, reason: 'endpoint-failed' });
      expect(errorHandler).toHaveBeenCalled();
      // Critically: no reauthenticate, no credential update — the manager
      // did not take over.
      expect(session.reauthenticate).not.toHaveBeenCalled();
      expect(updateCredential).not.toHaveBeenCalled();
    });

    it('enriches JWE token expiry from satClaims.expires_at when server response lacks expiry', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 120;
      // Server returns JWE with no expiry fields
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'jwe-token' })
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: expiresAt
      });

      await manager.activate(user, session, updateCredential);

      // effectiveExpireIn should be derived from satClaims.expires_at (in seconds)
      expect(manager.effectiveExpireIn).toBeGreaterThanOrEqual(115);
      expect(manager.effectiveExpireIn).toBeLessThanOrEqual(125);
    });
  });

  // =========================================================================
  // obtainToken()
  // =========================================================================

  describe('obtainToken()', () => {
    it('returns full DeviceTokenResponse from successful response', async () => {
      const tokenResponse: DeviceTokenResponse = {
        token: 'mock-client-bound-sat',
        expires_at: 1234567890
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const result = await manager.obtainToken();

      expect(result).toEqual(tokenResponse);
      expect(dpop.createHttpProof).toHaveBeenCalledWith({
        method: 'POST',
        uri: DEVICE_TOKEN_ENDPOINT
      });
      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: DEVICE_TOKEN_ENDPOINT,
          method: 'POST',
          body: JSON.stringify({
            dpop_token: 'mock-http-proof',
            expire_in: DEVICE_TOKEN_DEFAULT_EXPIRE_IN
          })
        })
      );
    });

    it('throws DeviceTokenError on non-ok response', async () => {
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        body: null
      });

      await expect(manager.obtainToken()).rejects.toThrow(DeviceTokenError);
      await expect(manager.obtainToken()).rejects.toThrow(
        'Failed to obtain device token: 403 Forbidden'
      );
    });

    it('throws DeviceTokenError when response body has no token field', async () => {
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ something_else: 'value' })
      });

      await expect(manager.obtainToken()).rejects.toThrow(DeviceTokenError);
      await expect(manager.obtainToken()).rejects.toThrow(
        'Device token response missing token field'
      );
    });
  });

  // =========================================================================
  // refreshToken()
  // =========================================================================

  describe('refreshToken()', () => {
    it('successfully refreshes: HTTP call, reauthenticate, update credential, returns data', async () => {
      const refreshedResponse: DeviceTokenResponse = {
        token: 'refreshed-sat',
        expires_at: Math.floor(Date.now() / 1000) + 900
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(refreshedResponse)
      });

      const result = await manager.refreshToken(session, 'current-token', updateCredential);

      expect(result).toEqual(refreshedResponse);

      // Should have created HTTP proof with access token
      expect(dpop.createHttpProof).toHaveBeenCalledWith({
        method: 'POST',
        uri: DEVICE_REFRESH_ENDPOINT,
        accessToken: 'current-token'
      });

      // Should have called HTTP request
      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: DEVICE_REFRESH_ENDPOINT,
          method: 'POST',
          body: JSON.stringify({
            dpop_token: 'mock-http-proof',
            expire_in: DEVICE_TOKEN_DEFAULT_EXPIRE_IN
          })
        })
      );

      // Should have reauthenticated with new token
      expect(dpop.createRpcProof).toHaveBeenCalledWith({
        method: 'signalwire.reauthenticate'
      });
      expect(session.reauthenticate).toHaveBeenCalledWith('refreshed-sat', 'mock-rpc-proof');

      // Should have updated credential
      expect(updateCredential).toHaveBeenCalledWith({ token: 'refreshed-sat' });
    });

    it('throws TokenRefreshError on HTTP failure', async () => {
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        body: null
      });

      await expect(manager.refreshToken(session, 'token', updateCredential)).rejects.toThrow(
        TokenRefreshError
      );
    });

    it('throws TokenRefreshError when response body has no token field', async () => {
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({})
      });

      await expect(manager.refreshToken(session, 'token', updateCredential)).rejects.toThrow(
        TokenRefreshError
      );
    });
  });

  // =========================================================================
  // expire_in TTL propagation
  // =========================================================================

  describe('expire_in TTL propagation', () => {
    it('refresh requests use the effective TTL from activate, not the default', async () => {
      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + 60
      });

      // Activate sets effectiveExpireIn from credential expiry
      await manager.activate(user, session, updateCredential);

      // Simulate a refresh — server returns a 60s token
      const refreshedToken = { token: 'refreshed-sat', expires_in: 60 };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(refreshedToken)
      });

      await manager.refreshToken(session, 'original-sat', updateCredential);

      // The refresh HTTP request should use expire_in derived from activate
      const refreshCall = (http.request as ReturnType<typeof vi.fn>).mock.calls[0];
      const refreshBody = JSON.parse(refreshCall[0].body);
      expect(refreshBody.expire_in).toBeGreaterThan(0);
    });

    it('updates effective TTL when refresh returns a different expiry', async () => {
      // Mock for activate's obtainToken call
      const activateToken = { token: 'client-bound-sat', expires_in: 60 };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(activateToken)
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + 60
      });

      await manager.activate(user, session, updateCredential);

      // First refresh returns 120s token
      const refreshed1 = { token: 'refreshed-1', expires_in: 120 };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(refreshed1)
      });

      await manager.refreshToken(session, 'client-bound-sat', updateCredential);

      // Second refresh should use expire_in: 120 (from first refresh)
      const refreshed2 = { token: 'refreshed-2', expires_in: 120 };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(refreshed2)
      });

      await manager.refreshToken(session, 'refreshed-1', updateCredential);

      // calls[0] = activate obtainToken, calls[1] = first refresh, calls[2] = second refresh
      const secondRefreshCall = (http.request as ReturnType<typeof vi.fn>).mock.calls[2];
      const secondBody = JSON.parse(secondRefreshCall[0].body);
      expect(secondBody.expire_in).toBe(120);
    });
  });

  // =========================================================================
  // Reactive refresh pipeline
  // =========================================================================

  describe('reactive refresh pipeline', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('schedules refresh based on token expiry via the reactive pipeline', async () => {
      const expiresInSeconds = 900;

      // Mock for activate's obtainToken call
      const activateToken = {
        token: 'client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(activateToken)
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds
      });

      await manager.activate(user, session, updateCredential);

      // Reset mocks after activation to isolate refresh behavior
      (dpop.createHttpProof as ReturnType<typeof vi.fn>).mockClear();
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({
          token: 'refreshed-sat',
          expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds + expiresInSeconds
        })
      });

      // Timer should not have fired yet
      expect(dpop.createHttpProof).not.toHaveBeenCalled();

      // Advance time to the scheduled refresh point
      const expectedDelay = expiresInSeconds * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS;
      await vi.advanceTimersByTimeAsync(expectedDelay);

      // Refresh should have been triggered
      expect(dpop.createHttpProof).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          uri: DEVICE_REFRESH_ENDPOINT
        })
      );
    });

    it('uses minimum delay of 1000ms when token is about to expire', async () => {
      // Token expires in 1 second (less than DEVICE_TOKEN_REFRESH_BUFFER_MS)
      const tokenResponse: DeviceTokenResponse = {
        token: 'mock-client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + 1
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      // Reset to track refresh
      (dpop.createHttpProof as ReturnType<typeof vi.fn>).mockClear();
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'refreshed-sat', expires_at: 99999999999 })
      });

      // Should not fire before 1000ms minimum
      await vi.advanceTimersByTimeAsync(999);
      expect(dpop.createHttpProof).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(dpop.createHttpProof).toHaveBeenCalled();
    });

    it('calls errorHandler when all refresh retries fail', async () => {
      const tokenResponse: DeviceTokenResponse = {
        token: 'mock-client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + 60
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      // Make all refresh attempts fail
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        body: null
      });

      const refreshDelay = Math.max(60 * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(refreshDelay);

      // Wait for all retries with backoff (1s + 2s + final attempt)
      await vi.advanceTimersByTimeAsync(DEVICE_TOKEN_REFRESH_RETRY_BASE_MS);
      await vi.advanceTimersByTimeAsync(DEVICE_TOKEN_REFRESH_RETRY_BASE_MS * 2);
      // Allow async processing to complete
      await vi.runAllTimersAsync();

      expect(errorHandler).toHaveBeenCalled();
      const emittedError = errorHandler.mock.calls[errorHandler.mock.calls.length - 1][0];
      expect(emittedError).toBeInstanceOf(TokenRefreshError);
    });

    it('skips concurrent refresh when one is already in progress', async () => {
      // Mock for activate's obtainToken call
      const activateToken = { token: 'client-bound-sat', expires_in: 60 };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(activateToken)
      });

      const user = createMockUser({
        scope: ['sat:refresh'],
        expires_at: Math.floor(Date.now() / 1000) + 60
      });

      await manager.activate(user, session, updateCredential);

      // Record call count after activation
      const callsAfterActivate = (http.request as ReturnType<typeof vi.fn>).mock.calls.length;

      // Make refresh slow (never resolves during the test)
      let resolveRefresh: (() => void) | undefined;
      (http.request as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => {
          resolveRefresh = () =>
            resolve({
              ok: true,
              status: 200,
              statusText: 'OK',
              body: JSON.stringify({ token: 'new-tok', expires_at: 99999999999 })
            });
        })
      );

      const refreshDelay = Math.max(60 * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(refreshDelay);

      // Only 1 new HTTP call should have been made (the refresh attempt)
      const refreshCalls =
        (http.request as ReturnType<typeof vi.fn>).mock.calls.length - callsAfterActivate;

      // Resolve the pending refresh to allow cleanup, then destroy to stop the chain
      resolveRefresh?.();
      await Promise.resolve();
      await Promise.resolve();
      manager.destroy();

      expect(refreshCalls).toBe(1);
    });
  });

  // =========================================================================
  // destroy()
  // =========================================================================

  describe('destroy()', () => {
    it('calls super.destroy() for cleanup', () => {
      // Spy on the Destroyable prototype's destroy
      const superDestroySpy = vi.spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(manager)),
        'destroy'
      );

      manager.destroy();

      expect(superDestroySpy).toHaveBeenCalled();
      superDestroySpy.mockRestore();
    });

    it('pause() prevents the reactive pipeline from firing refresh', async () => {
      vi.useFakeTimers();

      const tokenResponse: DeviceTokenResponse = {
        token: 'mock-client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + 60
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      (dpop.createHttpProof as ReturnType<typeof vi.fn>).mockClear();
      manager.pause();

      const refreshDelay = Math.max(60 * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(refreshDelay + 5000);

      // Paused — refresh must NOT fire.
      expect(dpop.createHttpProof).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('resume() re-enables refresh after pause()', async () => {
      vi.useFakeTimers();

      // First activation succeeds; reuse same response for subsequent refresh.
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({
          token: 'mock-tok',
          expires_at: Math.floor(Date.now() / 1000) + 60
        })
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      manager.pause();
      // Now resume — subsequent token emissions should fire refresh again.
      manager.resume();

      (dpop.createHttpProof as ReturnType<typeof vi.fn>).mockClear();
      const refreshDelay = Math.max(60 * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(refreshDelay);

      expect(dpop.createHttpProof).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('activation caching: second activate() reuses cached token, skips obtainToken HTTP exchange', async () => {
      // First activation: hits /devices/token endpoint.
      const tokenResponse: DeviceTokenResponse = {
        token: 'cached-cb-sat',
        expires_at: Math.floor(Date.now() / 1000) + 900
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);
      expect(http.request).toHaveBeenCalledTimes(1);

      // Second activation (reconnect): cached token is fresh, so no HTTP call.
      (session.reauthenticate as ReturnType<typeof vi.fn>).mockClear();
      const newSession = createMockSession();
      await manager.activate(user, newSession, updateCredential);

      // /devices/token was NOT hit a second time.
      expect(http.request).toHaveBeenCalledTimes(1);
      // But reauthenticate WAS called on the new session with the cached token.
      expect(newSession.reauthenticate).toHaveBeenCalledWith(
        'cached-cb-sat',
        'mock-rpc-proof',
        { clientBound: true }
      );
    });

    it('activation caching: buffer-edge boundary — token expiring exactly at buffer is treated stale', async () => {
      // `isTokenFresh` uses strict `>` against DEVICE_TOKEN_REFRESH_BUFFER_MS.
      // A token with time-to-expiry === BUFFER is therefore stale.
      vi.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const exactlyAtBuffer = now + Math.floor(DEVICE_TOKEN_REFRESH_BUFFER_MS / 1000);

      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'edge-stale', expires_at: exactlyAtBuffer })
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      // Second activation must fetch a new token because the cached one is
      // exactly at the buffer (not strictly above).
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'fresh-after-edge', expires_at: now + 900 })
      });

      await manager.activate(user, createMockSession(), updateCredential);

      expect(http.request).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('activation caching: buffer-edge boundary — token expiring just past buffer is treated fresh', async () => {
      // A token with time-to-expiry === BUFFER + 1s is strictly above the
      // buffer and must be reused.
      vi.useFakeTimers();
      const now = Math.floor(Date.now() / 1000);
      const justPastBuffer = now + Math.floor(DEVICE_TOKEN_REFRESH_BUFFER_MS / 1000) + 1;

      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'edge-fresh', expires_at: justPastBuffer })
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);
      expect(http.request).toHaveBeenCalledTimes(1);

      // Second activation should reuse the cached token — no new HTTP request.
      await manager.activate(user, createMockSession(), updateCredential);
      expect(http.request).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('activation caching: stale token (close to expiry) forces a fresh obtainToken', async () => {
      // Cached token has expires_at within the refresh buffer — treated stale.
      const staleExpiresAt = Math.floor(Date.now() / 1000) + 5; // 5s ahead, less than 30s buffer
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify({ token: 'stale', expires_at: staleExpiresAt })
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      // Second activation must hit /devices/token again because the cached
      // token is within the refresh buffer.
      const freshResponse = {
        token: 'fresh',
        expires_at: Math.floor(Date.now() / 1000) + 900
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(freshResponse)
      });

      await manager.activate(user, createMockSession(), updateCredential);

      expect(http.request).toHaveBeenCalledTimes(2);
    });

    it('prevents refresh after destroy', async () => {
      vi.useFakeTimers();

      const tokenResponse: DeviceTokenResponse = {
        token: 'mock-client-bound-sat',
        expires_at: Math.floor(Date.now() / 1000) + 60
      };
      (http.request as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: JSON.stringify(tokenResponse)
      });

      const user = createMockUser({ scope: ['sat:refresh'] });
      await manager.activate(user, session, updateCredential);

      // Reset mocks to track refresh
      (dpop.createHttpProof as ReturnType<typeof vi.fn>).mockClear();

      // Destroy before timer fires
      manager.destroy();

      const refreshDelay = Math.max(60 * 1000 - DEVICE_TOKEN_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(refreshDelay + 5000);

      // No refresh should have been triggered
      expect(dpop.createHttpProof).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
