/**
 * Regression coverage for the `-32003` "Requester validation failed"
 * staleness (customer report, 4.0.0-rc.2): once an unbound SAT's in-memory
 * token goes stale, no path re-credentials the live session until a page
 * reload. These tests lock in the four SDK fixes at the orchestrator level:
 *
 *  - Item 1: a developer refresh reauthenticates the LIVE session
 *    (reauthenticateLiveSession), not just storage.
 *  - Item 2: the reconnect hook (refreshCredentialForReconnect) re-mints
 *    via refresh() for unbound sessions and authenticate() for client-bound.
 *  - Item 3: recovery heals a -32002/-32003 on register()/dial() by
 *    re-crediting and retrying, escalating until the operation succeeds.
 *
 * Item 4 (resume-from-suspension) is covered at the coordinator /
 * DeviceTokenManager unit level.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { of } from 'rxjs';

import { CallCreateError, InvalidCredentialsError, JSONRPCError } from '../core/errors';
import { findJSONRPCError } from '../utils/authRecovery';
import { SignalWire } from './SignalWire';

import type { ClientSessionManager } from '../managers/ClientSessionManager';
import type { StorageManager } from '../managers/StorageManager';
import type { CredentialProvider, WebRTCApiProvider } from '../dependencies/interfaces';
import type { SDKCredential } from '../core/types/common.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWebRTCApiProvider(): WebRTCApiProvider {
  return {
    RTCPeerConnection: vi.fn() as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
      enumerateDevices: vi.fn().mockResolvedValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  };
}

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    setItem: vi.fn(async (key: string, value: string | null) => {
      if (value !== null) store.set(key, value);
      else store.delete(key);
    }),
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    })
  };
}

interface MockProvider extends CredentialProvider {
  authenticate: ReturnType<typeof vi.fn>;
  refresh?: ReturnType<typeof vi.fn>;
}

/**
 * A structurally-valid JWT (header `{"alg":"HS256","typ":"JWT"}`) so the
 * construction-time `jwtDecode(token, { header: true })` in validateCredentials
 * succeeds. The signature is irrelevant — the SDK only reads the header.
 */
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIn0.signature';

/** A token-based (unbound SAT) provider — the reported customer configuration. */
function createTokenProvider(opts: { withRefresh: boolean }): MockProvider {
  const provider: MockProvider = {
    authenticate: vi.fn().mockResolvedValue({ token: FAKE_JWT, expiry_at: Date.now() + 60_000 })
  };
  if (opts.withRefresh) {
    provider.refresh = vi
      .fn()
      .mockResolvedValue({ token: 'sat-refreshed', expiry_at: Date.now() + 120_000 });
  }
  return provider;
}

function createClient(provider: CredentialProvider): SignalWire {
  return new SignalWire(provider, {
    skipConnection: true,
    skipRegister: true,
    skipDeviceMonitoring: true,
    webRTCApiProvider: createMockWebRTCApiProvider(),
    storageImplementation: createMockStorage()
  });
}

function getPrivate<T>(obj: unknown, field: string): T {
  return (obj as Record<string, unknown>)[field] as T;
}

function setPrivate(obj: unknown, field: string, value: unknown): void {
  (obj as Record<string, unknown>)[field] = value;
}

async function settleAsyncInit(client: SignalWire): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const credential = getPrivate<{ credential?: SDKCredential }>(client, '_deps').credential;
    if (credential && (credential.token || credential.authorizationState)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for client async init to settle');
}

/** Install a mock session with the fields the credential paths touch. */
function installMockSession(
  client: SignalWire,
  opts: { clientBound?: boolean; reauthenticate?: ReturnType<typeof vi.fn> } = {}
): { reauthenticate: ReturnType<typeof vi.fn> } {
  const reauthenticate = opts.reauthenticate ?? vi.fn().mockResolvedValue(undefined);
  const session = {
    clientBound: opts.clientBound ?? false,
    authenticated: true,
    reauthenticate
  } as unknown as ClientSessionManager;
  setPrivate(client, '_clientSession', session);
  return { reauthenticate };
}

function callPrivate<T>(client: SignalWire, method: string, ...args: unknown[]): T {
  const fn = getPrivate<(...a: unknown[]) => T>(client, method);
  return fn.call(client, ...args);
}

// ---------------------------------------------------------------------------
// Item 2 — refreshCredentialForReconnect: re-mint mechanism by binding
// ---------------------------------------------------------------------------

describe('refreshCredentialForReconnect (reconnect re-mint)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('client-bound session re-mints via authenticate() with the DPoP fingerprint', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installMockSession(client, { clientBound: true });

    provider.authenticate.mockClear();
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'refreshCredentialForReconnect');

    expect(provider.authenticate).toHaveBeenCalledTimes(1);
    expect(provider.refresh).not.toHaveBeenCalled();
  });

  it('unbound session re-mints via the developer refresh() handler, never authenticate()', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installMockSession(client, { clientBound: false });

    provider.authenticate.mockClear();
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'refreshCredentialForReconnect');

    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(provider.authenticate).not.toHaveBeenCalled();
    expect(getPrivate<{ credential: SDKCredential }>(client, '_deps').credential.token).toBe(
      'sat-refreshed'
    );
  });

  it('unbound session with no refresh handler does NOT call authenticate() (may be interactive)', async () => {
    const provider = createTokenProvider({ withRefresh: false });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installMockSession(client, { clientBound: false });

    provider.authenticate.mockClear();

    await callPrivate<Promise<void>>(client, 'refreshCredentialForReconnect');

    expect(provider.authenticate).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Preflight (page reload) — no session exists yet, so `clientBound` cannot be
  // read off the session. The token and authorization_state are opaque to the
  // SDK (encrypted payload; only the JWT header is decoded), so binding cannot
  // be recovered from them either. A persisted marker is the only signal, and
  // without it a client-bound session that also has a refresh handler is
  // silently degraded to an unbound token on reload.
  // -------------------------------------------------------------------------

  it('preflight (no session) re-mints a marked client-bound session via authenticate()', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    // Reload state: the session has not been built yet.
    setPrivate(client, '_clientSession', undefined);
    await getPrivate<StorageManager>(client, '_deps').storage.setItem('sw:client_bound', true);

    provider.authenticate.mockClear();
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'refreshCredentialForReconnect');

    expect(
      provider.authenticate,
      'a client-bound session must re-bind via authenticate(), not degrade to an unbound refresh token'
    ).toHaveBeenCalledTimes(1);
    expect(provider.refresh).not.toHaveBeenCalled();
  });

  it('preflight (no session) with no marker re-mints an unbound session via refresh()', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    setPrivate(client, '_clientSession', undefined);

    provider.authenticate.mockClear();
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'refreshCredentialForReconnect');

    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(provider.authenticate).not.toHaveBeenCalled();
  });

  it('persists the client-bound marker so a later preflight reload can read it', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    callPrivate<void>(client, 'persistClientBoundMarker', true);

    const marker = await getPrivate<StorageManager>(client, '_deps').storage.getItem<boolean>(
      'sw:client_bound'
    );
    expect(marker).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Item 3 — the re-mint stage of credential recovery
// ---------------------------------------------------------------------------

describe('remintAndReauthenticate (the re-mint stage)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not offer the in-memory token back to the server before minting', async () => {
    // A resume accepts the in-memory token even when requests on the session
    // are refused, so offering it back before minting is a false positive that
    // skips the mint.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installMockSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'in-memory-token' });

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(reauthenticate).not.toHaveBeenCalledWith('in-memory-token');
    expect(provider.refresh).toHaveBeenCalledTimes(1);
  });

  it('re-mints an unbound session via provider.refresh()', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    const { reauthenticate } = installMockSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const recovered = await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(recovered).toBe(true);
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    // The only reauth is the one carrying the re-minted token.
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(reauthenticate).toHaveBeenCalledWith('sat-refreshed');
  });

  it('never re-mints a client-bound session through the refresh handler', async () => {
    // A bound session must stay bound: the developer refresh handler returns an
    // unbound token, so the bound path re-mints via authenticate() instead.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    installMockSession(client, { clientBound: true });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'bound-token' });

    const recovered = await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(recovered).toBe(true);
    expect(provider.refresh).not.toHaveBeenCalled();
    expect(provider.authenticate).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Item 3 — dial() retries once on a recoverable auth error
// ---------------------------------------------------------------------------

describe('dial() recovery on -32003', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubReadySession(
    client: SignalWire,
    createOutboundCall: ReturnType<typeof vi.fn>
  ): void {
    const session = {
      clientBound: false,
      reauthenticate: vi.fn().mockResolvedValue(undefined),
      createOutboundCall
    } as unknown as ClientSessionManager;
    setPrivate(client, '_clientSession', session);
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'in-memory-token' });
    // Bypass the ready$ gate — auth readiness is orthogonal to this behavior.
    setPrivate(client, 'waitAuthentication', vi.fn().mockResolvedValue(undefined));
  }

  it('recovers the credential and retries the dial once on a wrapped -32003', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    const fakeCall = { id: 'call-1' };
    const createOutboundCall = vi
      .fn()
      .mockRejectedValueOnce(
        new CallCreateError(
          'Call creation failed',
          new JSONRPCError(-32003, 'Requester validation failed'),
          'outbound'
        )
      )
      .mockResolvedValueOnce(fakeCall);
    stubReadySession(client, createOutboundCall);

    const call = await client.dial('/public/test-room');

    expect(createOutboundCall).toHaveBeenCalledTimes(2);
    expect(call).toBe(fakeCall);
  });

  it('does NOT retry when the failure is not a recoverable auth error', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    const createOutboundCall = vi
      .fn()
      .mockRejectedValue(new CallCreateError('Call creation failed', new Error('boom'), 'outbound'));
    stubReadySession(client, createOutboundCall);

    await expect(client.dial('/public/test-room')).rejects.toBeInstanceOf(CallCreateError);
    expect(createOutboundCall).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Item 3 — register() recovers and retries subscriber.online once
// ---------------------------------------------------------------------------

describe('register() recovery on -32003', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recovers the credential and retries subscriber.online once after a failure', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    installMockSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'in-memory-token' });
    setPrivate(client, 'waitAuthentication', vi.fn().mockResolvedValue(undefined));

    const execute = vi
      .fn()
      .mockRejectedValueOnce(new JSONRPCError(-32003, 'Requester validation failed'))
      .mockResolvedValueOnce(undefined);
    setPrivate(client, '_transport', { execute });

    await client.register();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(client.isRegistered).toBe(true);
  });

  it('re-mints even when the register failure was not an auth rejection', async () => {
    // No gating on the error kind: a rotation spent on a failure that turned
    // out transient costs one token; skipping the mint on a failure that was
    // not transient costs the session.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    installMockSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'in-memory-token' });
    setPrivate(client, 'waitAuthentication', vi.fn().mockResolvedValue(undefined));

    const execute = vi.fn().mockRejectedValue(new Error('network down'));
    setPrivate(client, '_transport', { execute });

    provider.refresh?.mockClear();
    await expect(client.register()).rejects.toBeDefined();
    expect(provider.refresh).toHaveBeenCalledTimes(1);
  });

  it('surfaces InvalidCredentialsError when subscriber.online stays -32003 after recovery', async () => {
    // The staging condition (Mode B): the server ACCEPTS the reauthentication —
    // the resume short-circuits token validation — yet keeps refusing
    // subscriber.online with -32003. Recovery must not report success on the
    // reauth alone; it verifies by re-running the operation, and when that stays
    // refused register() surfaces a terminal InvalidCredentialsError.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);

    const reauthenticate = vi.fn().mockResolvedValue(undefined); // reauth "accepted"
    installMockSession(client, { clientBound: false, reauthenticate });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'in-memory-token' });
    setPrivate(client, 'waitAuthentication', vi.fn().mockResolvedValue(undefined));

    // subscriber.online is refused on BOTH the initial attempt and the retry.
    const execute = vi.fn().mockRejectedValue(new JSONRPCError(-32003, 'Requester validation failed'));
    setPrivate(client, '_transport', { execute });

    const errors: unknown[] = [];
    const sub = client.errors$.subscribe((e) => errors.push(e));

    provider.refresh?.mockClear();
    let thrown: unknown;
    try {
      await client.register();
    } catch (error) {
      thrown = error;
    }
    sub.unsubscribe();

    // Recovery was attempted (re-mint + reauth), the operation was re-run once,
    // and the persistent refusal became a terminal error — not a false success.
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(reauthenticate).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(thrown).toBeInstanceOf(InvalidCredentialsError);
    expect((thrown as Error).cause).toBeInstanceOf(JSONRPCError);
    expect(client.isRegistered).toBe(false);
    expect(getPrivate<boolean>(client, '_credentialRecovered')).toBe(false);
    expect(errors.some((e) => e instanceof InvalidCredentialsError)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Item 1 — reauthenticateLiveSession
// ---------------------------------------------------------------------------

describe('reauthenticateLiveSession (live-session reauth on refresh)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reauthenticates the open session with the new token', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installMockSession(client, { clientBound: false });
    setPrivate(client, '_isConnected$', { value: true });

    await callPrivate<Promise<void>>(client, 'reauthenticateLiveSession', {
      token: 'sat-refreshed'
    } as SDKCredential);

    expect(reauthenticate).toHaveBeenCalledWith('sat-refreshed');
  });

  it('is a no-op when the credential has no token', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installMockSession(client, { clientBound: false });
    setPrivate(client, '_isConnected$', { value: true });

    await callPrivate<Promise<void>>(client, 'reauthenticateLiveSession', {
      authorizationState: 'x'
    } as SDKCredential);

    expect(reauthenticate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Contract (2026-09-03) — recovery mints first, and is verified
//
// Traced from a staging failure: after a page reload the session resumes on the
// persisted authorization_state and authenticates fine, then `subscriber.online`
// is refused with -32003. Recovery reauthenticated with the SAME in-memory token,
// the server accepted that resume, recovery reported success, and the retried
// request was refused identically — so the re-mint that could have healed it was
// never reached, even though a refresh handler was available.
//
// The contract these tests pin:
//   1. Recovery does not offer the in-memory token as evidence. It mints.
//   2. The mint mechanism follows the binding: client-bound re-mints a bound
//      base SAT via authenticate({ fingerprint }), never the developer refresh
//      handler; unbound uses refresh().
//   3. The new credential is adopted only after the live session accepts it.
//   4. No gating on the triggering error: rotation cost is not a reason to skip
//      a mint. The only reason to skip is having no means to mint.
//   5. Unbound with no refresh handler fails gracefully.
//   6. Recovery NEVER clears the resume state — it is what associates the
//      reloaded socket with the previous session, and reattach depends on that
//      association. Recovery is mint + `reauthenticate` on the same connection,
//      and nothing else.
//   7. On success the accepted credential is persisted to BOTH memory and
//      storage, so a further reload starts from the token the server took.
// ---------------------------------------------------------------------------

describe('credential recovery — revised contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * installMockSession, plus a spy on the resume-state teardown so a test can
   * assert recovery never reaches for it. `reconnectWithoutResumeState` is
   * gone; `cleanupStoredConnectionParams` is the surviving way to clear the
   * resume state, and recovery must not call it either.
   */
  function installSession(
    client: SignalWire,
    opts: { clientBound?: boolean; reauthenticate?: ReturnType<typeof vi.fn> } = {}
  ): {
    reauthenticate: ReturnType<typeof vi.fn>;
    cleanupStoredConnectionParams: ReturnType<typeof vi.fn>;
  } {
    const { reauthenticate } = installMockSession(client, opts);
    const cleanupStoredConnectionParams = vi.fn().mockResolvedValue(undefined);
    const session = getPrivate<Record<string, unknown>>(client, '_clientSession');
    session.cleanupStoredConnectionParams = cleanupStoredConnectionParams;
    return { reauthenticate, cleanupStoredConnectionParams };
  }

  it('mints a new token instead of replaying the in-memory one', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    provider.refresh?.mockClear();

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(provider.refresh, 'a mint is attempted').toHaveBeenCalledTimes(1);
    expect(
      reauthenticate,
      'the refused token is never offered back to the server as evidence'
    ).not.toHaveBeenCalledWith('stale-token');
  });

  it('reauthenticates the live session with the newly minted token', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    await expect(
      callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate')
    ).resolves.toBe(true);

    expect(reauthenticate).toHaveBeenCalledWith('sat-refreshed');
  });

  it('adopts the new credential only after the session accepts it', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    let tokenWhenReauthCalled: string | undefined;
    const reauthenticate = vi.fn(async () => {
      tokenWhenReauthCalled = getPrivate<{ credential: SDKCredential }>(client, '_deps').credential
        .token;
    });
    installSession(client, { clientBound: false, reauthenticate });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(
      tokenWhenReauthCalled,
      'the credential is not swapped before the server accepts the new token'
    ).toBe('stale-token');
    expect(
      getPrivate<{ credential: SDKCredential }>(client, '_deps').credential.token,
      'and is swapped once it does'
    ).toBe('sat-refreshed');
  });

  it('keeps the previous credential when the session rejects the minted token', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const reauthenticate = vi.fn().mockRejectedValue(new JSONRPCError(-32003, 'still refused'));
    installSession(client, { clientBound: false, reauthenticate });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    // The return value is covered by 'reports failure when the minted token is
    // also rejected'. What must hold here is that a token the server refused is
    // never left behind as the credential.
    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(
      getPrivate<{ credential: SDKCredential }>(client, '_deps').credential.token,
      'a token the server refused is never persisted as the current credential'
    ).toBe('stale-token');
  });

  it('re-mints a client-bound session through authenticate(), never the refresh handler', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: true });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    provider.authenticate.mockClear();
    provider.refresh?.mockClear();

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(provider.authenticate, 'bound sessions re-mint a bound base SAT').toHaveBeenCalledTimes(
      1
    );
    expect(
      provider.refresh,
      'the developer refresh handler would return an unbound token and silently degrade the session'
    ).not.toHaveBeenCalled();
  });

  it('passes the DPoP fingerprint when re-minting a client-bound session', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: true });
    setPrivate(client, '_dpopManager', { initialized: true, fingerprint: 'jkt-abc' });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    provider.authenticate.mockClear();

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(provider.authenticate).toHaveBeenCalledWith({ fingerprint: 'jkt-abc' });
  });

  it('mints regardless of what the triggering failure was', async () => {
    // Rotation cost is not a reason to skip a mint; only having no means to
    // mint is.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    provider.refresh?.mockClear();

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(provider.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to authenticate() for an unbound session with no refresh handler', async () => {
    const provider = createTokenProvider({ withRefresh: false });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    provider.authenticate.mockClear();

    await callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate');

    expect(
      provider.authenticate,
      'authenticate() may be interactive, so it is not a silent fallback'
    ).not.toHaveBeenCalled();
  });

  it('reports failure when there is no way to mint', async () => {
    // With nothing to mint from, recovery cannot help, and reporting that is
    // the honest outcome — better than discarding the resume state, which would
    // cost the session association reattach needs.
    const provider = createTokenProvider({ withRefresh: false });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { reauthenticate } = installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const operation = vi.fn();
    const outcome = await callPrivate<Promise<{ ok: boolean }>>(
      client,
      'recoverAndRetry',
      operation as () => Promise<unknown>
    );

    expect(outcome.ok).toBe(false);
    expect(reauthenticate, 'nothing was minted, so nothing was offered').not.toHaveBeenCalled();
    expect(operation, 'and the operation is not retried against an unchanged session').not.toHaveBeenCalled();
  });

  it('reports failure when the minted token is also rejected', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const reauthenticate = vi.fn().mockRejectedValue(new JSONRPCError(-32003, 'still refused'));
    installSession(client, { clientBound: false, reauthenticate });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const outcome = await callPrivate<Promise<{ ok: boolean }>>(
      client,
      'recoverAndRetry',
      async () => undefined
    );

    expect(outcome.ok, 'a session that refuses a fresh token is not recovered').toBe(false);
  });

  it('never clears the resume state, whatever the outcome', async () => {
    // The resume state is what ties the reloaded socket to the previous
    // session, so no recovery outcome may discard it.
    const provider = createTokenProvider({ withRefresh: true });

    for (const operation of [
      async (): Promise<string> => 'healed',
      async (): Promise<never> => {
        throw new JSONRPCError(-32003, 'Requester validation failed');
      }
    ]) {
      const client = createClient(provider);
      await settleAsyncInit(client);
      const { cleanupStoredConnectionParams } = installSession(client, { clientBound: false });
      setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

      await callPrivate<Promise<{ ok: boolean }>>(client, 'recoverAndRetry', operation);

      expect(
        cleanupStoredConnectionParams,
        'recovery keeps the session association reattach depends on'
      ).not.toHaveBeenCalled();
    }
  });

  it('persists the accepted credential to memory and to storage', async () => {
    // Spec step 5. Storage is what a further reload reads, so a token the
    // server accepted has to reach both or the next reload replays the stale
    // one and the whole recovery repeats.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    const storage = getPrivate<{
      getItem: (key: string) => Promise<SDKCredential | null>;
    }>(client, '_deps').storage;

    await expect(callPrivate<Promise<boolean>>(client, 'remintAndReauthenticate')).resolves.toBe(
      true
    );
    // persistCredential writes without awaiting; let the write settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      getPrivate<{ credential: SDKCredential }>(client, '_deps').credential.token,
      'in memory'
    ).toBe('sat-refreshed');
    expect((await storage.getItem('sw:cached_credential'))?.token, 'and in storage').toBe(
      'sat-refreshed'
    );
  });
});

// ---------------------------------------------------------------------------
// register() when the server keeps refusing
// ---------------------------------------------------------------------------

describe('register() — the server refuses even after recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries exactly once and rejects with the underlying rejection as cause', async () => {
    // The staging case: subscriber.online refused, recovery runs, the retry is
    // refused identically. The application must get the -32003, not a bare
    // "recovery also failed", and the SDK must not loop.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installMockSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });
    setPrivate(client, 'waitAuthentication', vi.fn().mockResolvedValue(undefined));

    const refusal = new JSONRPCError(-32003, 'Requester validation failed');
    const execute = vi.fn().mockRejectedValue(refusal);
    setPrivate(client, '_transport', { execute });

    await expect(client.register()).rejects.toMatchObject({
      name: 'InvalidCredentialsError'
    });

    expect(execute, 'one original attempt and exactly one retry').toHaveBeenCalledTimes(2);
    expect(client.isRegistered).toBe(false);

    const raised = await client.register().catch((error: unknown) => error);
    expect(
      findJSONRPCError(raised),
      'the server rejection survives in the cause chain'
    ).toMatchObject({ code: -32003 });
  });
});

// ---------------------------------------------------------------------------
// The operation is the only verdict on recovery
//
// Observed on staging run 33826974634: a freshly minted token was accepted by
// `signalwire.reauthenticate`, and `subscriber.online` was refused anyway (and
// so was the `verto.invite` reattach that followed). So an accepted
// reauthentication is not evidence the session works — but the answer is to
// report the refusal, not to destroy the session association the caller is
// reconnecting for. Recovery is one step, and the operation says whether it
// worked.
// ---------------------------------------------------------------------------

describe('recoverAndRetry — mint and reauthenticate, judged by the operation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** installMockSession plus a spy on the surviving resume-state teardown. */
  function installSession(
    client: SignalWire,
    opts: { clientBound?: boolean; reauthenticate?: ReturnType<typeof vi.fn> } = {}
  ): { cleanupStoredConnectionParams: ReturnType<typeof vi.fn> } {
    installMockSession(client, opts);
    const cleanupStoredConnectionParams = vi.fn().mockResolvedValue(undefined);
    const session = getPrivate<Record<string, unknown>>(client, '_clientSession');
    session.cleanupStoredConnectionParams = cleanupStoredConnectionParams;
    return { cleanupStoredConnectionParams };
  }

  const callLadder = async (
    client: SignalWire,
    operation: () => Promise<unknown>
  ): Promise<{ ok: boolean; error?: unknown }> =>
    callPrivate<Promise<{ ok: boolean; error?: unknown }>>(client, 'recoverAndRetry', operation);

  it('returns the operation value when the re-mint unblocks it', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { cleanupStoredConnectionParams } = installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const outcome = await callLadder(client, async () => 'registered');

    expect(outcome).toEqual({ ok: true, value: 'registered' });
    expect(cleanupStoredConnectionParams).not.toHaveBeenCalled();
  });

  it('reports the refusal when the mint is accepted but the operation is not', async () => {
    // The staging case exactly: hand the caller the server's refusal, once,
    // with the session left intact.
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    const { cleanupStoredConnectionParams } = installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const refusal = new JSONRPCError(-32003, 'Requester validation failed');
    const operation = vi.fn().mockRejectedValue(refusal);

    const outcome = await callLadder(client, operation as () => Promise<unknown>);

    expect(provider.refresh, 'the mint was tried').toHaveBeenCalledTimes(1);
    expect(operation, 'and the operation was retried exactly once').toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ ok: false, error: refusal });
    expect(
      cleanupStoredConnectionParams,
      'no escalation: the resume state survives a recovery that did not work'
    ).not.toHaveBeenCalled();
  });

  it('reports no error when there was no way to mint', async () => {
    // Nothing changed on the session, so the caller should fall back to the
    // error it already had rather than be handed a manufactured one.
    const provider = createTokenProvider({ withRefresh: false });
    const client = createClient(provider);
    await settleAsyncInit(client);
    installSession(client, { clientBound: false });
    setPrivate(getPrivate(client, '_deps'), 'credential', { token: 'stale-token' });

    const operation = vi.fn();
    const outcome = await callLadder(client, operation as () => Promise<unknown>);

    expect(outcome).toEqual({ ok: false, error: undefined });
    expect(operation, 'nothing was retried because nothing changed').not.toHaveBeenCalled();
  });

  it('marks the recovery verified only once the operation succeeds', async () => {
    // The attach path may discard an attach record only when a reattach is
    // denied on a credential the server has already accepted. That gate reads
    // this flag, so an accepted-but-ineffective reauthentication must not set
    // it — otherwise the staging case throws the record away again.
    const provider = createTokenProvider({ withRefresh: true });

    const refused = createClient(provider);
    await settleAsyncInit(refused);
    installSession(refused, { clientBound: false });
    setPrivate(getPrivate(refused, '_deps'), 'credential', { token: 'stale-token' });
    await callLadder(refused, async () => {
      throw new JSONRPCError(-32003, 'Requester validation failed');
    });
    expect(
      getPrivate<boolean>(refused, '_credentialRecovered'),
      'the reauthentication was accepted, but the session still refuses requests'
    ).toBe(false);

    const healed = createClient(provider);
    await settleAsyncInit(healed);
    installSession(healed, { clientBound: false });
    setPrivate(getPrivate(healed, '_deps'), 'credential', { token: 'stale-token' });
    await callLadder(healed, async () => 'registered');
    expect(getPrivate<boolean>(healed, '_credentialRecovered')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Preflight recovery — reload with an expired credential (Mode A)
//
// The user-info REST preflight runs before the transport (its storage keys are
// namespaced by the user id) and, unlike the WS resume, has no
// authorization_state to short-circuit token validation — so on a reload with an
// expired credential it is refused (401). No session exists yet to
// reauthenticate, so recovery re-mints via the provider and retries with a fresh
// User.
// ---------------------------------------------------------------------------

describe('fetchUserOrRecover (preflight credential recovery)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const USER_INFO = {
    id: 'sub-test',
    email: 'user@example.com',
    push_notification_key: 'pnk',
    fabric_addresses: []
  };

  /** Set `_user$` to a stand-in whose preflight fetch emits `emits`. */
  function stubInitialUserFetch(client: SignalWire, emits: boolean): void {
    getPrivate<{ next: (v: unknown) => void }>(client, '_user$').next({
      id: 'sub-test',
      fetched$: of(emits)
    });
  }

  /**
   * Replace the HTTP controller so the retry's `new User(_deps.http)` succeeds
   * only once the credential has actually been re-minted — tying the recovered
   * fetch to the re-mint, not to an unconditionally-happy mock.
   */
  function stubHttpAcceptingOnly(client: SignalWire, token: string): ReturnType<typeof vi.fn> {
    const deps = getPrivate<{ credential?: SDKCredential }>(client, '_deps');
    const request = vi.fn(async () =>
      deps.credential?.token === token
        ? { ok: true, body: JSON.stringify(USER_INFO) }
        : { ok: false, body: 'Unauthorized' }
    );
    setPrivate(deps, '_httpRequestController', { request });
    return request;
  }

  it('happy path: fetches the user and does not re-mint', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    stubInitialUserFetch(client, true);
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'fetchUserOrRecover');

    expect(provider.refresh).not.toHaveBeenCalled();
    expect(getPrivate<{ user: { id: string } }>(client, '_deps').user.id).toBe('sub-test');
  });

  it('refused preflight re-mints via refresh() and retries with a fresh User', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    stubInitialUserFetch(client, false);
    const request = stubHttpAcceptingOnly(client, 'sat-refreshed');
    provider.refresh?.mockClear();

    await callPrivate<Promise<void>>(client, 'fetchUserOrRecover');

    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(getPrivate<{ credential: SDKCredential }>(client, '_deps').credential.token).toBe(
      'sat-refreshed'
    );
    // The retry re-fetched (a fresh User hit the network) and adopted the user.
    expect(request).toHaveBeenCalledTimes(1);
    expect(getPrivate<{ user: { id: string } }>(client, '_deps').user.id).toBe('sub-test');
  });

  it('throws when the credential cannot be re-minted (no refresh handler)', async () => {
    const provider = createTokenProvider({ withRefresh: false });
    const client = createClient(provider);
    await settleAsyncInit(client);
    stubInitialUserFetch(client, false);
    // Retry can only ever see the original (still-refused) token.
    stubHttpAcceptingOnly(client, 'sat-refreshed');

    await expect(
      callPrivate<Promise<void>>(client, 'fetchUserOrRecover')
    ).rejects.toThrow('Error fetching user information');
  });
});

// ---------------------------------------------------------------------------
// handleAttachments — the credential-recovered latch is consumed, not sticky
//
// `_credentialRecovered` authorizes AttachManager to discard an attach record
// when a reattach is refused after a verified recovery. It must reflect a
// recovery since the LAST reattach — a stale `true` left over from an earlier
// recovery could authorize a wrong discard on a later reattach whose failure
// was merely transient. So reattach consumes it.
// ---------------------------------------------------------------------------

describe('handleAttachments (credential-recovered latch)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets the credential-recovered latch after reattach consumes it', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    setPrivate(getPrivate(client, '_options'), 'reconnectAttachedCalls', true);
    setPrivate(client, '_attachManager', {
      reattachCalls: vi.fn().mockResolvedValue(undefined)
    });
    setPrivate(client, '_credentialRecovered', true);

    await callPrivate<Promise<void>>(client, 'handleAttachments');

    expect(getPrivate<boolean>(client, '_credentialRecovered')).toBe(false);
  });

  it('resets the latch even when reattach throws', async () => {
    const provider = createTokenProvider({ withRefresh: true });
    const client = createClient(provider);
    await settleAsyncInit(client);
    setPrivate(getPrivate(client, '_options'), 'reconnectAttachedCalls', true);
    setPrivate(client, '_attachManager', {
      reattachCalls: vi.fn().mockRejectedValue(new Error('reattach blew up'))
    });
    setPrivate(client, '_credentialRecovered', true);

    await callPrivate<Promise<void>>(client, 'handleAttachments');

    expect(getPrivate<boolean>(client, '_credentialRecovered')).toBe(false);
  });
});
