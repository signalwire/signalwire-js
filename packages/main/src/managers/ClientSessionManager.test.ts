import { describe, it, expect, vi, beforeEach } from 'vitest';
import { firstValueFrom, take, combineLatest, BehaviorSubject, ReplaySubject } from 'rxjs';
import { ClientSessionManager, shouldAbortDial } from './ClientSessionManager';
import { JSONRPCError, MediaAccessError } from '../core/errors';
import type { CallError } from '../core/errors';
import type { StorageManager } from './StorageManager';
import type { TransportManager } from './TransportManager';
import type { AttachManager } from './AttachManager';
import type { DeviceController } from '../interfaces/DeviceController';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { SDKCredential } from '../core/types/common.types';

/**
 * Minimal mocks for ClientSessionManager construction.
 * These only need to satisfy the constructor signature — individual
 * tests may override specific methods as needed.
 */
function createMockStorage(): StorageManager {
  const store: Record<string, unknown> = {};
  return {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
    _store: store
  } as unknown as StorageManager;
}

function createMockTransport(): TransportManager {
  const protocol$ = new BehaviorSubject<string | undefined>(undefined);
  const connectionStatus$ = new BehaviorSubject<string>('disconnected');
  const incomingEvent$ = new ReplaySubject<unknown>(1);

  return {
    protocol$,
    connectionStatus$,
    incomingEvent$,
    connect: vi.fn(async () => {
      connectionStatus$.next('connected');
    }),
    disconnect: vi.fn(),
    reconnect: vi.fn(),
    execute: vi.fn(),
    send: vi.fn(),
    setProtocol: vi.fn(async (p: string | undefined) => {
      protocol$.next(p);
    }),
    destroy: vi.fn()
  } as unknown as TransportManager;
}

function createMockAttachManager(): AttachManager {
  return {
    setSession: vi.fn(),
    detachAll: vi.fn(async () => {}),
    flush: vi.fn(async () => {}),
    reattachCalls: vi.fn(async () => {})
  } as unknown as AttachManager;
}

function createMockDeviceController(): DeviceController {
  return {} as DeviceController;
}

function createMockWebRTCApiProvider(): WebRTCApiProvider {
  return {
    RTCPeerConnection: vi.fn()
  } as unknown as WebRTCApiProvider;
}

function createCredentialGetter(token = 'test-token'): () => SDKCredential {
  return () => ({ token }) as SDKCredential;
}

describe('ClientSessionManager', () => {
  let storage: StorageManager;
  let transport: ReturnType<typeof createMockTransport>;
  let attachManager: AttachManager;
  let csm: ClientSessionManager;

  beforeEach(() => {
    storage = createMockStorage();
    transport = createMockTransport() as unknown as ReturnType<typeof createMockTransport>;
    attachManager = createMockAttachManager();
  });

  function buildCSM(token = 'test-token') {
    csm = new ClientSessionManager(
      createCredentialGetter(token),
      transport as unknown as TransportManager,
      storage,
      'auth_state_key',
      createMockDeviceController(),
      attachManager,
      createMockWebRTCApiProvider()
    );
    return csm;
  }

  describe('cleanupStoredConnectionParams', () => {
    it('should clear authorizationState$ ReplaySubject so next authenticate sees no stored state', async () => {
      // Pre-seed storage with an authorization_state so init() loads it
      await storage.setItem('auth_state_key', 'old-authorization-state');

      const csm = buildCSM();
      // Wait for initialization (which loads auth state from storage)
      await firstValueFrom(csm.initialized$);

      // Verify authorizationState$ has the old value by reading it via the
      // combineLatest pattern that authenticate() uses
      const beforeCleanup = await firstValueFrom(
        combineLatest({
          protocol: (transport as unknown as { protocol$: BehaviorSubject<string | undefined> })
            .protocol$,
          // Access the private authorizationState$ via the same approach authenticate() uses
          // Since it's private, we test through cleanupStoredConnectionParams behavior
          authorization_state: (
            csm as unknown as { authorizationState$: ReplaySubject<string | undefined> }
          ).authorizationState$
        }).pipe(take(1))
      );
      expect(beforeCleanup.authorization_state).toBe('old-authorization-state');

      // Now clean up stored params (simulates what handleAuthenticationError does)
      await csm.cleanupStoredConnectionParams();

      // After cleanup, authorizationState$ should emit undefined
      const afterCleanup = await firstValueFrom(
        (
          csm as unknown as { authorizationState$: ReplaySubject<string | undefined> }
        ).authorizationState$.pipe(take(1))
      );
      expect(afterCleanup).toBeUndefined();

      // Storage should also be cleared (with default 'session' scope)
      expect(storage.removeItem).toHaveBeenCalledWith('auth_state_key');
    });

    it('should clear protocol and authorization but preserve attached calls', async () => {
      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      await csm.cleanupStoredConnectionParams();

      expect(transport.setProtocol).toHaveBeenCalledWith(undefined);
      // Attached calls are NOT cleared — they survive auth recovery
      // so reattachCalls() can find them after fresh connect.
      expect(attachManager.detachAll).not.toHaveBeenCalled();
    });
  });

  describe('teardownSessionState', () => {
    it('should clear resume state AND attach records atomically', async () => {
      await storage.setItem('auth_state_key', 'live-authorization-state');

      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      await csm.teardownSessionState();

      // Resume state cleared (protocol + authorization_state)
      expect(transport.setProtocol).toHaveBeenCalledWith(undefined);
      expect(storage.removeItem).toHaveBeenCalledWith('auth_state_key');
      // Attach records cleared too — the coupling invariant
      expect(attachManager.detachAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should tear down the transport and clear both resume state and attach records', async () => {
      await storage.setItem('auth_state_key', 'live-authorization-state');

      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      await csm.disconnect();

      expect(transport.disconnect).toHaveBeenCalled();
      expect(transport.setProtocol).toHaveBeenCalledWith(undefined);
      expect(storage.removeItem).toHaveBeenCalledWith('auth_state_key');
      expect(attachManager.detachAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleAuthenticationError - recoverable auth error', () => {
    it('should clean up stale state and reconnect when auth fails with stored state', async () => {
      // Seed storage with authorization state
      await storage.setItem('auth_state_key', 'stale-auth-state');

      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      // Verify state is loaded
      const authState$ = (
        csm as unknown as { authorizationState$: ReplaySubject<string | undefined> }
      ).authorizationState$;
      const stateBefore = await firstValueFrom(authState$.pipe(take(1)));
      expect(stateBefore).toBe('stale-auth-state');

      // Simulate the exact error path: "Requester validation failed" (-32003)
      const { JSONRPCError } = await import('../core/errors');
      const authError = new JSONRPCError(-32003, 'Requester validation failed');

      // Call the private handleAuthenticationError
      // hasStoredState now checks authorizationState$ (seeded from storage above)
      const handleAuthError = (
        csm as unknown as { handleAuthenticationError: (e: Error) => Promise<void> }
      ).handleAuthenticationError.bind(csm);

      await handleAuthError(authError);

      // After error handling, authorizationState$ should be cleared
      const stateAfter = await firstValueFrom(authState$.pipe(take(1)));
      expect(stateAfter).toBeUndefined();

      // Transport should have been told to reconnect
      expect(transport.reconnect).toHaveBeenCalled();

      // Attach records MUST survive the stale-auth recovery path so
      // post-reconnect reattach still works.
      expect(attachManager.detachAll).not.toHaveBeenCalled();
    });

    it('should NOT emit to errors$ for recoverable auth errors with stored state', async () => {
      await storage.setItem('auth_state_key', 'stale-auth-state');

      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      const { JSONRPCError } = await import('../core/errors');
      const authError = new JSONRPCError(-32003, 'Requester validation failed');

      const errors: Error[] = [];
      csm.errors$.subscribe((e) => errors.push(e));

      const handleAuthError = (
        csm as unknown as { handleAuthenticationError: (e: Error) => Promise<void> }
      ).handleAuthenticationError.bind(csm);
      await handleAuthError(authError);

      // Recoverable error with stored state should NOT be surfaced to consumers
      expect(errors).toHaveLength(0);
    });

    it('should emit to errors$ for non-recoverable auth errors', async () => {
      const csm = buildCSM();
      await firstValueFrom(csm.initialized$);

      // No stored state → auth error is fatal
      const { JSONRPCError } = await import('../core/errors');
      const authError = new JSONRPCError(-32003, 'Requester validation failed');

      const errors: Error[] = [];
      csm.errors$.subscribe((e) => errors.push(e));

      const handleAuthError = (
        csm as unknown as { handleAuthenticationError: (e: Error) => Promise<void> }
      ).handleAuthenticationError.bind(csm);
      await handleAuthError(authError);

      // No stored state to clear → error is fatal → surfaced to consumers
      expect(errors).toHaveLength(1);
      expect(transport.reconnect).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// shouldAbortDial — the dial-time errors$ race predicate
// ---------------------------------------------------------------------------

describe('shouldAbortDial', () => {
  const asCallError = (error: Error, fatal: boolean): CallError => ({
    kind: 'media',
    fatal,
    error,
    callId: 'call-1'
  });

  it('does not abort for a non-fatal MediaAccessError (receive-only fallback)', () => {
    const error = new MediaAccessError('acquireLocalMedia', 'audiovideo', new Error('denied'));
    expect(shouldAbortDial(asCallError(error, false))).toBe(false);
  });

  it('aborts for a fatal MediaAccessError (fallback disabled or no receive intent)', () => {
    const error = new MediaAccessError('acquireLocalMedia', 'audiovideo', new Error('denied'), true);
    expect(shouldAbortDial(asCallError(error, true))).toBe(true);
  });

  it('aborts for other non-fatal errors so dial() rejects with the real cause', () => {
    // e.g. a recoverable JSONRPCError is non-fatal for an established call,
    // but during dial nothing retries the invite — reject immediately.
    const error = new JSONRPCError(-32002, 'authentication failed');
    expect(shouldAbortDial(asCallError(error, false))).toBe(true);
  });

  it('aborts for fatal errors of any type', () => {
    expect(shouldAbortDial(asCallError(new Error('boom'), true))).toBe(true);
  });
});
