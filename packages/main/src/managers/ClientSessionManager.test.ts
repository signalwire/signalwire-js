import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  asapScheduler,
  BehaviorSubject,
  combineLatest,
  EmptyError,
  firstValueFrom,
  observeOn,
  ReplaySubject,
  take,
  TimeoutError
} from 'rxjs';
import {
  awaitDialReady,
  ClientSessionManager,
  ClientSessionWrapper,
  shouldAbortDial
} from './ClientSessionManager';
import { JSONRPCError, MediaAccessError } from '../core/errors';
import type { CallError } from '../core/errors';
import type { StorageManager } from './StorageManager';
import type { TransportManager } from './TransportManager';
import type { CryptoController } from '../controllers/CryptoController';
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

  // ==========================================================================
  // onBeforeReconnect gating (issue: -32003 staleness).
  // On a FRESH connect the hook must fire when the session is client-bound OR
  // the in-memory token is expired — so an unbound SAT gets re-minted before
  // authenticating instead of replaying a dead token (-32003).
  // ==========================================================================

  describe('onBeforeReconnect gating on fresh connect', () => {
    function buildWithCredential(credential: SDKCredential): ClientSessionManager {
      return new ClientSessionManager(
        () => credential,
        transport as unknown as TransportManager,
        storage,
        'auth_state_key',
        createMockDeviceController(),
        attachManager,
        createMockWebRTCApiProvider()
      );
    }

    async function invokeAuthenticate(session: ClientSessionManager): Promise<void> {
      // authenticate() runs the gate, then sends the connect RPC via the mock
      // transport.execute (which returns undefined) and throws downstream. The
      // gate (and any onBeforeReconnect call) runs first, so swallow the throw.
      try {
        await (session as unknown as { authenticate: () => Promise<void> }).authenticate();
      } catch {
        /* expected: mock transport has no valid connect response */
      }
    }

    it('invokes the hook when the unbound token is expired', async () => {
      const session = buildWithCredential({ token: 'stale', expiry_at: Date.now() - 1000 });
      await firstValueFrom(session.initialized$);
      const hook = vi.fn().mockResolvedValue(undefined);
      session.onBeforeReconnect = hook;

      await invokeAuthenticate(session);

      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('does NOT invoke the hook when the unbound token is still valid', async () => {
      const session = buildWithCredential({ token: 'fresh', expiry_at: Date.now() + 120_000 });
      await firstValueFrom(session.initialized$);
      const hook = vi.fn().mockResolvedValue(undefined);
      session.onBeforeReconnect = hook;

      await invokeAuthenticate(session);

      expect(hook).not.toHaveBeenCalled();
    });

    it('invokes the hook for a client-bound session even when the token is valid', async () => {
      const session = buildWithCredential({ token: 'bound', expiry_at: Date.now() + 120_000 });
      await firstValueFrom(session.initialized$);
      (session as unknown as { _wasClientBound: boolean })._wasClientBound = true;
      const hook = vi.fn().mockResolvedValue(undefined);
      session.onBeforeReconnect = hook;

      await invokeAuthenticate(session);

      expect(hook).toHaveBeenCalledTimes(1);
    });

    it('does NOT invoke the hook when the token has no expiry and the session is unbound', async () => {
      const session = buildWithCredential({ token: 'no-expiry' });
      await firstValueFrom(session.initialized$);
      const hook = vi.fn().mockResolvedValue(undefined);
      session.onBeforeReconnect = hook;

      await invokeAuthenticate(session);

      expect(hook).not.toHaveBeenCalled();
    });
  });

  describe('authentication result emission ordering', () => {
    it('emits authorization$ before authenticated$ flips true', async () => {
      // The credential-refresh arbitration depends on this ordering:
      // SignalWire's authorization$ subscription arms the developer refresh
      // timer (syncExpiryFromAuthorization), and the authenticated$-driven
      // activate() cancels it when the Client Bound SAT path takes ownership.
      // If authenticated$ ever fired first, the arm would land AFTER the
      // cancel and both refresh paths would stay live.
      const session = buildCSM();
      await firstValueFrom(session.initialized$);

      vi.mocked(transport.execute).mockResolvedValue({
        result: {
          identity: 'identity-1',
          protocol: 'proto-1',
          authorization: {
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
          }
        }
      } as never);

      const order: string[] = [];
      session.authorization$.subscribe((auth) => {
        if (auth) order.push('authorization');
      });
      session.authenticated$.subscribe((isAuthenticated) => {
        if (isAuthenticated) order.push('authenticated');
      });

      await (session as unknown as { authenticate: () => Promise<void> }).authenticate();

      expect(order).toEqual(['authorization', 'authenticated']);
    });
  });

  // ==========================================================================
  // Client-bound reload survival.
  // After a page reload the sticky _wasClientBound flag is gone, but the
  // persisted authorization_state still carries the BOUND authorization
  // (cnf.jkt) — the server REQUIRES a dpop_token on such a resume and rejects
  // with -32002 otherwise. The DPoP key survives reload (IndexedDB), so:
  //  - a resume must send a fresh proof whenever the key is available, and
  //  - clientBound must be restored from the connect result's authorization
  //    (server-authoritative classification: cnf.jkt != null).
  // ==========================================================================

  describe('reload-resume for client-bound sessions', () => {
    function createMockDpop(opts: { failProof?: boolean } = {}): CryptoController {
      return {
        initialized: true,
        createRpcProof: opts.failProof
          ? vi.fn().mockRejectedValue(new Error('proof failed'))
          : vi.fn().mockResolvedValue('fresh-proof')
      } as unknown as CryptoController;
    }

    function buildResumeSession(dpopManager?: CryptoController): ClientSessionManager {
      return new ClientSessionManager(
        createCredentialGetter('stored-sat'),
        transport as unknown as TransportManager,
        storage,
        'auth_state_key',
        createMockDeviceController(),
        attachManager,
        createMockWebRTCApiProvider(),
        dpopManager
      );
    }

    async function resume(session: ClientSessionManager): Promise<void> {
      try {
        await (session as unknown as { authenticate: () => Promise<void> }).authenticate();
      } catch {
        /* expected when the mock transport has no valid connect response */
      }
    }

    function executedConnectParams(): Record<string, unknown> {
      const request = (transport.execute as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as {
        params: Record<string, unknown>;
      };
      return request.params;
    }

    function connectResult(authorizationExtra: Record<string, unknown> = {}) {
      return {
        identity: 'identity-1',
        protocol: 'proto-x',
        authorization: {
          jti: 'jti-1',
          project_id: 'proj-1',
          fabric_subscriber: {
            version: 1,
            expires_at: Math.floor(Date.now() / 1000) + 600,
            subscriber_id: 'sub-1',
            application_id: null,
            project_id: 'proj-1',
            space_id: 'space-1'
          },
          ...authorizationExtra
        }
      };
    }

    beforeEach(async () => {
      // Reload state: persisted authorization_state + protocol + stored token.
      await storage.setItem('auth_state_key', 'stored-state');
      (transport as unknown as { protocol$: BehaviorSubject<string | undefined> }).protocol$.next(
        'proto-x'
      );
    });

    it('sends a fresh dpop_token on resume even before the session is known client-bound', async () => {
      const session = buildResumeSession(createMockDpop());
      await firstValueFrom(session.initialized$);

      await resume(session);

      const params = executedConnectParams();
      expect(params.authorization_state).toBe('stored-state');
      expect(params.dpop_token).toBe('fresh-proof');
    });

    it('resumes without a proof when no DPoP key is available', async () => {
      const session = buildResumeSession(undefined);
      await firstValueFrom(session.initialized$);

      await resume(session);

      const params = executedConnectParams();
      expect(params.authorization_state).toBe('stored-state');
      expect(params.dpop_token).toBeUndefined();
    });

    it('proceeds without a proof when proof creation fails and binding is unknown', async () => {
      const session = buildResumeSession(createMockDpop({ failProof: true }));
      await firstValueFrom(session.initialized$);

      await resume(session);

      const params = executedConnectParams();
      expect(params.authorization_state).toBe('stored-state');
      expect(params.dpop_token).toBeUndefined();
    });

    it('restores clientBound from a connect result whose authorization carries cnf.jkt', async () => {
      (transport.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        result: connectResult({ cnf: { jkt: 'thumbprint' } })
      });
      const session = buildResumeSession(createMockDpop());
      await firstValueFrom(session.initialized$);

      await resume(session);

      expect(session.clientBound).toBe(true);
    });

    it('leaves clientBound false when the connect authorization has no cnf', async () => {
      (transport.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        result: connectResult()
      });
      const session = buildResumeSession(createMockDpop());
      await firstValueFrom(session.initialized$);

      await resume(session);

      expect(session.clientBound).toBe(false);
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

// ---------------------------------------------------------------------------
// awaitDialReady — the dial-time wait over media, signaling and errors
// ---------------------------------------------------------------------------

describe('awaitDialReady', () => {
  const SIGNALING_TIMEOUT_MS = 5000;

  /**
   * Reproduce the production stream shapes, whose asymmetry is the whole point:
   * `Call.errors$` defers delivery by a microtask (deferEmission), while
   * `localMediaSettled$` is a raw internal subject that completes synchronously
   * when the peer connection is destroyed.
   */
  const createSession = () => {
    const settled$ = new ReplaySubject<void>(1);
    const selfId$ = new BehaviorSubject<string | null>(null);
    const errors$ = new ReplaySubject<CallError>(1);
    return {
      settled$,
      selfId$,
      errors$,
      session: {
        localMediaSettled$: settled$.asObservable(),
        selfId$: selfId$.asObservable(),
        errors$: errors$.asObservable().pipe(observeOn(asapScheduler))
      } as Parameters<typeof awaitDialReady>[0]
    };
  };

  const asCallError = (error: Error, fatal: boolean): CallError => ({
    kind: 'media',
    fatal,
    error,
    callId: 'call-1'
  });

  it('resolves once media settles and the member id arrives', async () => {
    const { settled$, selfId$, session } = createSession();
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    settled$.next();
    selfId$.next('member-1');

    await expect(promise).resolves.toBe('member-1');
  });

  it('rejects with the acquisition error when the failure also ends the media wait', async () => {
    // The production ordering for a denied microphone with the receive-only
    // fallback disabled: the controller reports the error and then destroys
    // itself in the same synchronous step, completing the media leg without it
    // ever emitting. Under `race` that bare completion won and dial() rejected
    // with an RxJS EmptyError, burying the NotAllowedError applications inspect.
    const { settled$, errors$, session } = createSession();
    const denied = new MediaAccessError(
      'acquireLocalMedia',
      'audio',
      Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }),
      true
    );
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    errors$.next(asCallError(denied, true));
    settled$.complete();

    await expect(promise).rejects.toBe(denied);
  });

  it('surfaces the original DOMException name through the rejection', async () => {
    const { settled$, errors$, session } = createSession();
    const original = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    const denied = new MediaAccessError('acquireLocalMedia', 'audio', original, true);
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    errors$.next(asCallError(denied, true));
    settled$.complete();

    await expect(promise).rejects.toMatchObject({
      name: 'MediaAccessError',
      originalError: { name: 'NotAllowedError' }
    });
  });

  it('rejects with a signaling error that arrives while waiting for the member id', async () => {
    const { settled$, errors$, session } = createSession();
    const rejected = new JSONRPCError(-32002, 'CALL DOES NOT EXIST');
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    settled$.next();
    errors$.next(asCallError(rejected, true));

    await expect(promise).rejects.toBe(rejected);
  });

  it('ignores a non-fatal MediaAccessError so the receive-only fallback still connects', async () => {
    const { settled$, selfId$, errors$, session } = createSession();
    const degraded = new MediaAccessError('acquireLocalMedia', 'audio', new Error('denied'));
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    errors$.next(asCallError(degraded, false));
    settled$.next();
    selfId$.next('member-1');

    await expect(promise).resolves.toBe('member-1');
  });

  it('rejects with a TimeoutError when the member id never arrives', async () => {
    vi.useFakeTimers();
    try {
      const { settled$, session } = createSession();
      const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);
      const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);

      settled$.next();
      await vi.advanceTimersByTimeAsync(SIGNALING_TIMEOUT_MS + 1);

      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not start the signaling clock while media is still being acquired', async () => {
    // Acquisition is human time — a permission prompt left open must not spend
    // the server's budget.
    vi.useFakeTimers();
    try {
      const { session } = createSession();
      let outcome = 'pending';
      void awaitDialReady(session, SIGNALING_TIMEOUT_MS).then(
        () => (outcome = 'resolved'),
        () => (outcome = 'rejected')
      );

      await vi.advanceTimersByTimeAsync(SIGNALING_TIMEOUT_MS * 4);

      expect(outcome, 'still waiting on the human, not timing out').toBe('pending');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a dial abandoned with no error as an empty sequence', async () => {
    // A hangup during acquisition ends both legs without a failure; the
    // EmptyError is what createOutboundCall reports as a generic create failure.
    const { settled$, errors$, session } = createSession();
    const promise = awaitDialReady(session, SIGNALING_TIMEOUT_MS);

    settled$.complete();
    errors$.complete();

    await expect(promise).rejects.toBeInstanceOf(EmptyError);
  });
});

// ---------------------------------------------------------------------------
// ClientSessionWrapper — public session surface
// ---------------------------------------------------------------------------

describe('ClientSessionWrapper', () => {
  it('exposes the session clientBound state (read-only)', () => {
    const csm = new ClientSessionManager(
      createCredentialGetter(),
      createMockTransport() as unknown as TransportManager,
      createMockStorage(),
      'auth_state_key',
      createMockDeviceController(),
      createMockAttachManager(),
      createMockWebRTCApiProvider()
    );
    const wrapper = new ClientSessionWrapper(csm);

    expect(wrapper.clientBound).toBe(false);
    (csm as unknown as { _wasClientBound: boolean })._wasClientBound = true;
    expect(wrapper.clientBound).toBe(true);
  });
});
