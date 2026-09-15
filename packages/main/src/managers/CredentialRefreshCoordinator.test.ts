import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  CREDENTIAL_ACTIVATE_TIMEOUT_MS,
  CREDENTIAL_REFRESH_BUFFER_MS,
  CREDENTIAL_REFRESH_MAX_RETRIES,
  CREDENTIAL_REFRESH_RETRY_BASE_MS
} from '../core/constants';
import { TokenRefreshError } from '../core/errors';

import { CredentialRefreshCoordinator } from './CredentialRefreshCoordinator';
import { DeviceTokenManager, type ActivationResult } from './DeviceTokenManager';

import type { ClientSessionManager } from './ClientSessionManager';
import type { CryptoController } from '../controllers/CryptoController';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { User } from '../core/entities/User';
import type { Authorization } from '../core/RPCMessages';
import type { SATClaims } from '../core/types/crypto.types';
import type { SDKCredential } from '../core/types/common.types';
import type { SDKWarning } from '../core/types/warnings.types';
import type { CredentialProvider } from '../dependencies/interfaces';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockCryptoController(initialized = true): CryptoController {
  return {
    initialized,
    fingerprint: 'mock-fingerprint',
    init: vi.fn(),
    createHttpProof: vi.fn().mockResolvedValue('mock-http-proof'),
    createRpcProof: vi.fn().mockResolvedValue('mock-rpc-proof'),
    destroy: vi.fn()
  } as unknown as CryptoController;
}

function createMockUser(satClaims?: SATClaims): User {
  return { satClaims } as unknown as User;
}

function createMockSession(): ClientSessionManager {
  return {
    authenticated: true,
    reauthenticate: vi.fn().mockResolvedValue(undefined)
  } as unknown as ClientSessionManager;
}

interface MockNotifier {
  onError: ReturnType<typeof vi.fn>;
  onWarning: ReturnType<typeof vi.fn>;
  onRefreshExhausted: ReturnType<typeof vi.fn>;
  onCredentialRefreshed: ReturnType<typeof vi.fn>;
}

interface MockStore {
  read: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  merge: ReturnType<typeof vi.fn>;
  persist: ReturnType<typeof vi.fn>;
}

interface MockDeps {
  http: () => HTTPRequestController;
  notifier: MockNotifier;
  store: MockStore;
}

function createDeps(): MockDeps {
  return {
    http: () => ({ request: vi.fn() }) as unknown as HTTPRequestController,
    notifier: {
      onError: vi.fn(),
      onWarning: vi.fn(),
      onRefreshExhausted: vi.fn(),
      onCredentialRefreshed: vi.fn().mockResolvedValue(undefined)
    },
    store: {
      read: vi.fn(() => ({}) as SDKCredential),
      write: vi.fn(),
      merge: vi.fn(),
      persist: vi.fn()
    }
  };
}

function createProvider(): CredentialProvider & {
  authenticate: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
} {
  return {
    authenticate: vi.fn().mockResolvedValue({}),
    refresh: vi.fn().mockResolvedValue({
      authorizationState: 'refreshed',
      expiry_at: Date.now() + 60_000
    })
  };
}

/**
 * Build a coordinator with the internal `DeviceTokenManager` replaced by a
 * stub via the public factory injection point. No reflection.
 */
function createWithStubManager(
  deps: MockDeps,
  stub: Partial<DeviceTokenManager>
): CredentialRefreshCoordinator {
  const fullStub = {
    destroy: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ...stub
  } as unknown as DeviceTokenManager;
  return new CredentialRefreshCoordinator(createMockCryptoController(), {
    ...deps,
    deviceTokenManagerFactory: () => fullStub
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CredentialRefreshCoordinator', () => {
  let deps: MockDeps;

  beforeEach(() => {
    deps = createDeps();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Construction & availability
  // =========================================================================

  describe('construction', () => {
    it('creates a DeviceTokenManager when DPoP is initialized', () => {
      const coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
      expect(coordinator.clientBoundSATAvailable).toBe(true);
      coordinator.destroy();
    });

    it('does NOT create a DeviceTokenManager when DPoP is undefined', () => {
      const coordinator = new CredentialRefreshCoordinator(undefined, deps);
      expect(coordinator.clientBoundSATAvailable).toBe(false);
      coordinator.destroy();
    });

    it('does NOT create a DeviceTokenManager when DPoP is uninitialized', () => {
      const coordinator = new CredentialRefreshCoordinator(
        createMockCryptoController(false),
        deps
      );
      expect(coordinator.clientBoundSATAvailable).toBe(false);
      coordinator.destroy();
    });

    it('uses the provided deviceTokenManagerFactory when given (test seam)', () => {
      const factory = vi.fn(
        () =>
          ({ destroy: vi.fn(), pause: vi.fn(), resume: vi.fn() }) as unknown as DeviceTokenManager
      );
      const coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), {
        ...deps,
        deviceTokenManagerFactory: factory
      });
      expect(factory).toHaveBeenCalledTimes(1);
      coordinator.destroy();
    });
  });

  // =========================================================================
  // scheduleDeveloperRefresh / cancelDeveloperRefresh
  // =========================================================================

  describe('scheduleDeveloperRefresh', () => {
    let coordinator: CredentialRefreshCoordinator;

    beforeEach(() => {
      vi.useFakeTimers();
      coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
    });

    afterEach(() => {
      coordinator.destroy();
      vi.useRealTimers();
    });

    it('arms the developer timer and reports developerRefreshArmed=true', () => {
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      expect(coordinator.developerRefreshArmed).toBe(true);
    });

    it('replaces an existing timer instead of stacking', async () => {
      const provider = createProvider();
      provider.refresh.mockResolvedValueOnce({ authorizationState: 'refreshed' });
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(provider.refresh).toHaveBeenCalledTimes(1);
    });

    it('cancelDeveloperRefresh disarms the timer', () => {
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      coordinator.cancelDeveloperRefresh();
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('cancelDeveloperRefresh is idempotent', () => {
      coordinator.cancelDeveloperRefresh();
      coordinator.cancelDeveloperRefresh();
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('invokes provider.refresh and persists the new credential on the scheduled tick', async () => {
      const provider = createProvider();
      const newCred: SDKCredential = {
        authorizationState: 'refreshed',
        expiry_at: Date.now() + 120_000
      };
      provider.refresh.mockResolvedValueOnce(newCred);

      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      const expectedDelay = Math.max(60_000 - CREDENTIAL_REFRESH_BUFFER_MS, 1000);
      await vi.advanceTimersByTimeAsync(expectedDelay);

      expect(provider.refresh).toHaveBeenCalledTimes(1);
      expect(deps.store.write).toHaveBeenCalledWith(newCred);
      expect(deps.store.persist).toHaveBeenCalledWith(newCred);
    });

    it('retries with backoff and calls onRefreshExhausted after max retries', async () => {
      const provider = createProvider();
      provider.refresh.mockRejectedValue(new Error('network failure'));

      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);

      await vi.advanceTimersByTimeAsync(Math.max(60_000 - CREDENTIAL_REFRESH_BUFFER_MS, 1000));

      for (let attempt = 1; attempt < CREDENTIAL_REFRESH_MAX_RETRIES; attempt++) {
        await vi.advanceTimersByTimeAsync(CREDENTIAL_REFRESH_RETRY_BASE_MS * Math.pow(2, attempt));
      }

      expect(provider.refresh).toHaveBeenCalledTimes(CREDENTIAL_REFRESH_MAX_RETRIES);
      expect(deps.notifier.onRefreshExhausted).toHaveBeenCalledTimes(1);
      const lastError = deps.notifier.onError.mock.calls.at(-1)?.[0] as unknown;
      expect(lastError).toBeInstanceOf(TokenRefreshError);
    });

    // Item 1: a successful developer refresh must reauthenticate the live
    // session, not just store the new token. The coordinator signals this
    // through the onCredentialRefreshed notifier hook.
    it('invokes onCredentialRefreshed with the new credential after a successful refresh', async () => {
      const provider = createProvider();
      const newCred: SDKCredential = { token: 'fresh-token', expiry_at: Date.now() + 120_000 };
      provider.refresh.mockResolvedValueOnce(newCred);

      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      await vi.advanceTimersByTimeAsync(Math.max(60_000 - CREDENTIAL_REFRESH_BUFFER_MS, 1000));

      expect(deps.notifier.onCredentialRefreshed).toHaveBeenCalledWith(newCred);
    });

    it('does NOT retry or reschedule differently when onCredentialRefreshed rejects (best-effort)', async () => {
      const provider = createProvider();
      const newCred: SDKCredential = { token: 'fresh-token' }; // no expiry → no reschedule
      provider.refresh.mockResolvedValueOnce(newCred);
      deps.notifier.onCredentialRefreshed.mockRejectedValueOnce(new Error('reauth failed'));

      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      await vi.advanceTimersByTimeAsync(Math.max(60_000 - CREDENTIAL_REFRESH_BUFFER_MS, 1000));

      // Refresh treated as successful: no retry, no exhaustion signal.
      expect(provider.refresh).toHaveBeenCalledTimes(1);
      expect(deps.notifier.onRefreshExhausted).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // forceRefreshIfDue() — resume-from-suspension
  // =========================================================================

  describe('forceRefreshIfDue', () => {
    let coordinator: CredentialRefreshCoordinator;

    beforeEach(() => {
      vi.useFakeTimers();
      coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
    });

    afterEach(() => {
      coordinator.destroy();
      vi.useRealTimers();
    });

    it('forces an immediate developer refresh when the credential is past the refresh window', async () => {
      const provider = createProvider();
      const newCred: SDKCredential = { token: 'fresh-token' }; // no expiry → no reschedule
      provider.refresh.mockResolvedValueOnce(newCred);
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);

      // Simulate a throttled-timer resume: the credential is now within the
      // refresh buffer (past due) but the armed timer has not fired.
      deps.store.read.mockReturnValue({ expiry_at: Date.now() + 1000 } as SDKCredential);

      coordinator.forceRefreshIfDue();
      await vi.advanceTimersByTimeAsync(0);

      expect(provider.refresh).toHaveBeenCalledTimes(1);
      // Timer was consumed (no reschedule since newCred has no expiry).
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('is a no-op when the credential still has headroom', () => {
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      deps.store.read.mockReturnValue({ expiry_at: Date.now() + 60_000 } as SDKCredential);

      coordinator.forceRefreshIfDue();

      expect(provider.refresh).not.toHaveBeenCalled();
      expect(coordinator.developerRefreshArmed).toBe(true);
    });

    it('delegates to the Client Bound SAT pipeline when the developer timer is not armed', () => {
      const refreshNowIfDue = vi.fn();
      const stubbed = createWithStubManager(deps, { refreshNowIfDue });

      stubbed.forceRefreshIfDue();

      expect(refreshNowIfDue).toHaveBeenCalledTimes(1);
      stubbed.destroy();
    });
  });

  // =========================================================================
  // refreshCredential() — shared in-flight dedupe (concurrency safety)
  // =========================================================================

  describe('refreshCredential', () => {
    let coordinator: CredentialRefreshCoordinator;

    beforeEach(() => {
      coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
    });

    afterEach(() => {
      coordinator.destroy();
    });

    it('dedupes concurrent callers into a single provider.refresh()', async () => {
      const provider = createProvider();
      let resolveRefresh: ((cred: SDKCredential) => void) | undefined;
      provider.refresh.mockReturnValueOnce(
        new Promise<SDKCredential>((resolve) => {
          resolveRefresh = resolve;
        })
      );

      const p1 = coordinator.refreshCredential(provider);
      const p2 = coordinator.refreshCredential(provider);

      // Both callers share one in-flight network call.
      expect(provider.refresh).toHaveBeenCalledTimes(1);

      const cred: SDKCredential = { token: 'fresh' };
      resolveRefresh?.(cred);
      const [c1, c2] = await Promise.all([p1, p2]);
      expect(c1).toBe(cred);
      expect(c2).toBe(cred);
    });

    it('allows a new refresh once the previous one settles', async () => {
      const provider = createProvider();
      provider.refresh.mockResolvedValue({ token: 'fresh' } as SDKCredential);

      await coordinator.refreshCredential(provider);
      await coordinator.refreshCredential(provider);

      expect(provider.refresh).toHaveBeenCalledTimes(2);
    });

    it('rejects when the provider has no refresh handler', async () => {
      const provider = { authenticate: vi.fn() } as unknown as CredentialProvider;
      await expect(coordinator.refreshCredential(provider)).rejects.toBeDefined();
    });
  });

  // =========================================================================
  // syncExpiryFromAuthorization() — server-authoritative expiry
  // =========================================================================

  describe('syncExpiryFromAuthorization', () => {
    let coordinator: CredentialRefreshCoordinator;

    beforeEach(() => {
      vi.useFakeTimers();
      coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
    });

    afterEach(() => {
      coordinator.destroy();
      vi.useRealTimers();
    });

    function makeAuthorization(expiresAtSec: number): Authorization {
      return {
        jti: 'jti-1',
        project_id: 'proj-1',
        fabric_subscriber: {
          version: 1,
          expires_at: expiresAtSec,
          subscriber_id: 'sub-1',
          application_id: null,
          project_id: 'proj-1',
          space_id: 'space-1'
        }
      };
    }

    it('corrects the stored credential expiry from fabric_subscriber.expires_at (seconds → ms)', () => {
      deps.store.read.mockReturnValue({ token: 'sat' } as SDKCredential);
      const expiresAtSec = Math.floor(Date.now() / 1000) + 180;

      coordinator.syncExpiryFromAuthorization(makeAuthorization(expiresAtSec), createProvider());

      const expected = { token: 'sat', expiry_at: expiresAtSec * 1000 };
      expect(deps.store.write).toHaveBeenCalledWith(expected);
      expect(deps.store.persist).toHaveBeenCalledWith(expected);
    });

    it('re-arms the developer refresh timer against the server expiry when refresh() exists', () => {
      deps.store.read.mockReturnValue({ token: 'sat' } as SDKCredential);

      coordinator.syncExpiryFromAuthorization(
        makeAuthorization(Math.floor(Date.now() / 1000) + 180),
        createProvider()
      );

      expect(coordinator.developerRefreshArmed).toBe(true);
    });

    it('updates the credential but does NOT arm the timer without a refresh handler', () => {
      deps.store.read.mockReturnValue({ token: 'sat' } as SDKCredential);
      const provider = { authenticate: vi.fn() } as unknown as CredentialProvider;

      coordinator.syncExpiryFromAuthorization(
        makeAuthorization(Math.floor(Date.now() / 1000) + 180),
        provider
      );

      expect(deps.store.write).toHaveBeenCalledTimes(1);
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('is a no-op for an undefined authorization', () => {
      coordinator.syncExpiryFromAuthorization(undefined, createProvider());

      expect(deps.store.write).not.toHaveBeenCalled();
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('is a no-op when the authorization lacks fabric_subscriber at runtime', () => {
      // The type marks fabric_subscriber as required, but the value is
      // server-supplied — a variant omitting it must not throw inside the
      // authorization$ subscription (which would kill the subscription).
      const authorization = { jti: 'jti-1', project_id: 'proj-1' } as Authorization;

      expect(() =>
        coordinator.syncExpiryFromAuthorization(authorization, createProvider())
      ).not.toThrow();
      expect(deps.store.write).not.toHaveBeenCalled();
      expect(coordinator.developerRefreshArmed).toBe(false);
    });

    it('is a no-op when the stored expiry already matches (no timer churn)', () => {
      const expiresAtSec = Math.floor(Date.now() / 1000) + 180;
      deps.store.read.mockReturnValue({
        token: 'sat',
        expiry_at: expiresAtSec * 1000
      } as SDKCredential);

      coordinator.syncExpiryFromAuthorization(makeAuthorization(expiresAtSec), createProvider());

      expect(deps.store.write).not.toHaveBeenCalled();
      expect(coordinator.developerRefreshArmed).toBe(false);
    });
  });

  // =========================================================================
  // activate()
  // =========================================================================

  describe('activate()', () => {
    it('returns early without effect when DPoP is unavailable', async () => {
      vi.useFakeTimers();
      const noDpop = new CredentialRefreshCoordinator(undefined, deps);
      const provider = createProvider();
      noDpop.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      expect(noDpop.developerRefreshArmed).toBe(true);

      await noDpop.activate(createMockUser(), createMockSession());

      expect(noDpop.developerRefreshArmed).toBe(true);
      expect(deps.notifier.onWarning).not.toHaveBeenCalled();
      vi.useRealTimers();
      noDpop.destroy();
    });

    it('cancels developer timer and does NOT emit fallback warning when activation succeeds', async () => {
      const coordinator = createWithStubManager(deps, {
        activate: vi.fn().mockResolvedValue({ activated: true })
      });
      vi.useFakeTimers();
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      vi.useRealTimers();

      await coordinator.activate(createMockUser({ scope: ['sat:refresh'] }), createMockSession());

      expect(coordinator.developerRefreshArmed).toBe(false);
      expect(deps.notifier.onWarning).not.toHaveBeenCalled();
      coordinator.destroy();
    });

    it('keeps developer timer armed and emits fallback warning when activation declines', async () => {
      const coordinator = createWithStubManager(deps, {
        activate: vi.fn().mockResolvedValue({ activated: false, reason: 'no-scope' })
      });
      vi.useFakeTimers();
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      vi.useRealTimers();

      await coordinator.activate(createMockUser(), createMockSession());

      expect(coordinator.developerRefreshArmed).toBe(true);
      expect(deps.notifier.onWarning).toHaveBeenCalledWith(
        expect.objectContaining<Partial<SDKWarning>>({
          code: 'credential_refresh_fallback',
          source: 'CredentialProvider',
          reason: 'no-scope'
        })
      );
      coordinator.destroy();
    });

    it('drops re-entrant activate() calls (idempotency guard)', async () => {
      let resolveActivate: ((result: ActivationResult) => void) | undefined;
      const activateStub = vi.fn().mockReturnValue(
        new Promise<ActivationResult>((resolve) => {
          resolveActivate = resolve;
        })
      );
      const coordinator = createWithStubManager(deps, { activate: activateStub });

      const first = coordinator.activate(createMockUser(), createMockSession());
      const second = coordinator.activate(createMockUser(), createMockSession());

      resolveActivate?.({ activated: true });
      await Promise.all([first, second]);

      // Inner activate called only once; the second was dropped silently.
      expect(activateStub).toHaveBeenCalledTimes(1);
      expect(deps.notifier.onWarning).not.toHaveBeenCalled();
      expect(deps.notifier.onError).not.toHaveBeenCalled();
      coordinator.destroy();
    });

    it('cancels a timer re-armed by syncExpiryFromAuthorization while activate() was in flight', async () => {
      // Reconnect interleaving: cycle N's authorization$ arms the developer
      // timer while cycle N-1's activate() is still in flight, so cycle N's
      // own activate() is dropped by the re-entrancy guard. The in-flight
      // activation must cancel the timer armed AFTER it started — otherwise
      // the developer timer and the Client Bound SAT pipeline would both
      // stay live (double-refresh).
      let resolveActivate: ((result: ActivationResult) => void) | undefined;
      const activateStub = vi.fn().mockReturnValue(
        new Promise<ActivationResult>((resolve) => {
          resolveActivate = resolve;
        })
      );
      const coordinator = createWithStubManager(deps, { activate: activateStub });
      deps.store.read.mockReturnValue({ token: 'sat' } as SDKCredential);

      const inFlight = coordinator.activate(createMockUser(), createMockSession());

      vi.useFakeTimers();
      coordinator.syncExpiryFromAuthorization(
        {
          jti: 'jti-1',
          project_id: 'proj-1',
          fabric_subscriber: {
            version: 1,
            expires_at: Math.floor(Date.now() / 1000) + 180,
            subscriber_id: 'sub-1',
            application_id: null,
            project_id: 'proj-1',
            space_id: 'space-1'
          }
        },
        createProvider()
      );
      vi.useRealTimers();
      expect(coordinator.developerRefreshArmed).toBe(true);

      const dropped = coordinator.activate(createMockUser(), createMockSession());

      resolveActivate?.({ activated: true });
      await Promise.all([inFlight, dropped]);

      expect(activateStub).toHaveBeenCalledTimes(1);
      expect(coordinator.developerRefreshArmed).toBe(false);
      expect(deps.notifier.onWarning).not.toHaveBeenCalled();
      coordinator.destroy();
    });

    it('discards stale results when generation advances during in-flight activate()', async () => {
      let resolveFirst: ((result: ActivationResult) => void) | undefined;
      const activateStub = vi
        .fn()
        .mockReturnValueOnce(
          new Promise<ActivationResult>((resolve) => {
            resolveFirst = resolve;
          })
        )
        .mockResolvedValueOnce({ activated: false, reason: 'no-scope' });
      const coordinator = createWithStubManager(deps, { activate: activateStub });

      vi.useFakeTimers();
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      vi.useRealTimers();

      const firstCall = coordinator.activate(createMockUser(), createMockSession());

      // Force generation bump to simulate a newer activation preempting the
      // in-flight one.
      (coordinator as unknown as { _activationGeneration: number })._activationGeneration += 1;

      resolveFirst?.({ activated: true });
      await firstCall;

      // Stale resolution must not cancel the developer timer or emit a warning.
      expect(coordinator.developerRefreshArmed).toBe(true);
      expect(deps.notifier.onWarning).not.toHaveBeenCalled();
      coordinator.destroy();
    });

    it('times out and falls back to developer refresh when activate() hangs (Security Risk B)', async () => {
      vi.useFakeTimers();
      const pause = vi.fn();
      // Stub never resolves — only the timeout race can complete the activation.
      const coordinator = createWithStubManager(deps, {
        activate: vi.fn().mockImplementation(() => new Promise(() => {})),
        pause
      });
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);

      const activationPromise = coordinator.activate(createMockUser(), createMockSession());
      await vi.advanceTimersByTimeAsync(CREDENTIAL_ACTIVATE_TIMEOUT_MS + 100);
      await activationPromise;

      // Developer timer survives; fallback warning emitted with the timeout reason.
      expect(coordinator.developerRefreshArmed).toBe(true);
      expect(deps.notifier.onWarning).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'activation-timeout' })
      );
      // Critical: manager is paused so any late-completing inner activate
      // cannot arm a competing refresh pipeline (Security FINDING-1).
      expect(pause).toHaveBeenCalled();

      vi.useRealTimers();
      coordinator.destroy();
    });

    it('resumes a paused internal manager before activating', async () => {
      const resume = vi.fn();
      const coordinator = createWithStubManager(deps, {
        activate: vi.fn().mockResolvedValue({ activated: true }),
        resume
      });

      await coordinator.activate(createMockUser(), createMockSession());

      expect(resume).toHaveBeenCalledTimes(1);
      coordinator.destroy();
    });
  });

  // =========================================================================
  // suspend() — disconnect-time pause of both refresh paths
  // =========================================================================

  describe('suspend()', () => {
    it('cancels developer timer and pauses internal manager', () => {
      const pause = vi.fn();
      const coordinator = createWithStubManager(deps, { pause });
      vi.useFakeTimers();
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      vi.useRealTimers();
      expect(coordinator.developerRefreshArmed).toBe(true);

      coordinator.suspend();

      expect(coordinator.developerRefreshArmed).toBe(false);
      expect(pause).toHaveBeenCalledTimes(1);
      coordinator.destroy();
    });

    it('no-op safe when no internal manager exists (DPoP unavailable)', () => {
      const noDpop = new CredentialRefreshCoordinator(undefined, deps);
      expect(() => noDpop.suspend()).not.toThrow();
      noDpop.destroy();
    });
  });

  // =========================================================================
  // destroy()
  // =========================================================================

  describe('destroy()', () => {
    it('cancels developer refresh and tears down the internal manager', () => {
      const coordinator = new CredentialRefreshCoordinator(createMockCryptoController(), deps);
      vi.useFakeTimers();
      const provider = createProvider();
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      vi.useRealTimers();
      expect(coordinator.developerRefreshArmed).toBe(true);

      coordinator.destroy();

      expect(coordinator.developerRefreshArmed).toBe(false);
      expect(coordinator.clientBoundSATAvailable).toBe(false);
    });
  });
});
