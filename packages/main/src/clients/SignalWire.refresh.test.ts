/**
 * Refresh-precedence tests for the SignalWire orchestrator.
 *
 * Regression coverage for issue #19074: when a developer supplies a
 * `CredentialProvider` with `refresh()` and the backend mints a plain SAT
 * (no `sat:refresh` scope), the developer's `refresh()` must fire — the SDK
 * previously cancelled the developer timer before checking whether the
 * Client Bound SAT path could take over.
 *
 * Phase 2: refresh state lives in {@link CredentialRefreshCoordinator}. These
 * tests drive the coordinator (via the SignalWire client) and assert via the
 * coordinator's public `developerRefreshArmed` seam plus spy assertions on
 * the developer-provided `refresh()`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { firstValueFrom, take, toArray } from 'rxjs';

import { CREDENTIAL_REFRESH_BUFFER_MS } from '../core/constants';
import { SignalWire } from './SignalWire';

import type { User } from '../core/entities/User';
import type { SDKWarning } from '../core/types/warnings.types';
import type { SATClaims } from '../core/types/crypto.types';
import type { CredentialProvider, WebRTCApiProvider } from '../dependencies/interfaces';
import type { CredentialRefreshCoordinator } from '../managers/CredentialRefreshCoordinator';
import type {
  DeviceTokenManager,
  ActivationResult
} from '../managers/DeviceTokenManager';

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

function createProvider(opts: {
  withRefresh: boolean;
  expiresInMs?: number;
}): MockProvider {
  const expiresInMs = opts.expiresInMs ?? 60_000;
  const credential = { authorizationState: 'test-auth-state', expiry_at: Date.now() + expiresInMs };
  const provider: MockProvider = {
    authenticate: vi.fn().mockResolvedValue(credential)
  };
  if (opts.withRefresh) {
    provider.refresh = vi.fn().mockResolvedValue({
      authorizationState: 'refreshed-auth-state',
      expiry_at: Date.now() + expiresInMs * 2
    });
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

function getCoordinator(client: SignalWire): CredentialRefreshCoordinator {
  return getPrivate<CredentialRefreshCoordinator>(client, '_refreshCoordinator');
}

/**
 * Wait for the client's resolveCredentials → validateCredentials chain to
 * finish so the coordinator's developer timer is observable. The chain spans
 * real promises (crypto.subtle key generation, the provider's authenticate),
 * so wait until `_deps.credential` is populated rather than guessing
 * microtask depth.
 *
 * Uses real timers — fake timers stall the WebCrypto operations inside
 * `initDPoP`.
 */
async function settleAsyncInit(client: SignalWire): Promise<void> {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const credential = getPrivate<{
      credential?: { token?: string; authorizationState?: string };
    }>(client, '_deps').credential;
    if (credential && (credential.token || credential.authorizationState)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for client async init to settle');
}

function installMockUser(client: SignalWire, satClaims?: SATClaims): void {
  const mockUser = { satClaims } as unknown as User;
  const deps = getPrivate<{ user: User }>(client, '_deps');
  deps.user = mockUser;
}

/**
 * Inject a stubbed {@link DeviceTokenManager} into the coordinator so the
 * internal Client Bound SAT path can be driven deterministically.
 */
function installMockDeviceTokenManager(
  client: SignalWire,
  result: ActivationResult,
  satClaims?: SATClaims
): { activate: ReturnType<typeof vi.fn> } {
  installMockUser(client, satClaims);
  const activate = vi.fn().mockResolvedValue(result);
  const mockManager = {
    activate,
    destroy: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn()
  } as unknown as DeviceTokenManager;
  setPrivate(getCoordinator(client), '_deviceTokenManager', mockManager);
  // The coordinator passes `_clientSession` through to activate(); the mock
  // ignores it so a stub is sufficient.
  setPrivate(client, '_clientSession', {});
  return { activate };
}

/**
 * Simulate the "DPoP unavailable" cell: clear the coordinator's internal
 * manager so `activate()` short-circuits.
 */
function clearInternalManager(client: SignalWire): void {
  installMockUser(client);
  setPrivate(getCoordinator(client), '_deviceTokenManager', undefined);
  setPrivate(client, '_clientSession', {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignalWire refresh precedence (issue #19074)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Commit gates: failure of either means the bug is back.
  // Uses a short expiry so the developer refresh fires within the test
  // timeout under real timers.
  // ==========================================================================

  it('calls developer refresh() when /devices/token endpoint fails transiently', async () => {
    // Regression coverage for the catch-path: activate() must decline (not seed
    // the pipeline with an unbound token) so the developer timer fires.
    const provider = createProvider({
      withRefresh: true,
      expiresInMs: CREDENTIAL_REFRESH_BUFFER_MS + 500
    });
    const client = createClient(provider);
    await settleAsyncInit(client);

    installMockDeviceTokenManager(client, { activated: false, reason: 'endpoint-failed' });

    await getCoordinator(client).activate(
      getPrivate<{ user: User }>(client, '_deps').user,
      getPrivate(client, '_clientSession')
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(provider.refresh).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('calls developer refresh() when SAT lacks sat:refresh scope (DPoP available)', async () => {
    const provider = createProvider({
      withRefresh: true,
      expiresInMs: CREDENTIAL_REFRESH_BUFFER_MS + 500
    });
    const client = createClient(provider);
    await settleAsyncInit(client);

    installMockDeviceTokenManager(client, { activated: false, reason: 'no-scope' });

    await getCoordinator(client).activate(
      getPrivate<{ user: User }>(client, '_deps').user,
      getPrivate(client, '_clientSession')
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    expect(provider.refresh).toHaveBeenCalledTimes(1);
  }, 10_000);

  // ==========================================================================
  // 3-cell precedence matrix: DPoP capability x sat:refresh scope.
  // The 4th cell (no DPoP + scope present) is unreachable — without DPoP the
  // server cannot bind the SAT, so "scope present" collapses into one row.
  // Asserts the seam invariant via the coordinator's public
  // `developerRefreshArmed` getter; the firing behavior is covered by the
  // commit-gate tests above.
  // ==========================================================================

  type Cell = {
    name: string;
    activationResult: ActivationResult | 'no-manager';
    expectTimerCleared: boolean;
  };

  const MATRIX: readonly Cell[] = [
    {
      name: 'DPoP up + scope present  → internal owns refresh, developer timer cancelled',
      activationResult: { activated: true },
      expectTimerCleared: true
    },
    {
      name: 'DPoP up + scope absent   → developer refresh keeps running (issue #19074)',
      activationResult: { activated: false, reason: 'no-scope' },
      expectTimerCleared: false
    },
    {
      name: 'DPoP unavailable         → developer refresh is the only path',
      activationResult: 'no-manager',
      expectTimerCleared: false
    }
  ];

  for (const cell of MATRIX) {
    it(cell.name, async () => {
      const provider = createProvider({ withRefresh: true, expiresInMs: 60_000 });
      const client = createClient(provider);
      await settleAsyncInit(client);

      const coordinator = getCoordinator(client);
      if (cell.activationResult === 'no-manager') {
        clearInternalManager(client);
      } else {
        installMockDeviceTokenManager(client, cell.activationResult);
      }

      expect(coordinator.developerRefreshArmed).toBe(true);

      await coordinator.activate(
        getPrivate<{ user: User }>(client, '_deps').user,
        getPrivate(client, '_clientSession')
      );

      if (cell.expectTimerCleared) {
        // `developerRefreshArmed` becoming false means `clearTimeout` ran
        // and the timer cannot fire. The XOR invariant is enforced at the
        // coordinator unit level (CredentialRefreshCoordinator.test.ts)
        // with fake timers — no need for a brittle real-time sleep here.
        expect(coordinator.developerRefreshArmed).toBe(false);
        expect(provider.refresh).not.toHaveBeenCalled();
      } else {
        expect(coordinator.developerRefreshArmed).toBe(true);
      }
    });
  }

  // ==========================================================================
  // Reconnect: activate() must be re-run with the same precedence on each
  // session re-authentication. Verify that a state change across reconnect
  // (scope was present, becomes absent) is honored — the developer timer
  // must be re-armed.
  // ==========================================================================

  describe('reconnect re-arms refresh', () => {
    it('keeps developer refresh armed when reconnect activate declines', async () => {
      const provider = createProvider({ withRefresh: true, expiresInMs: 60_000 });
      const client = createClient(provider);
      await settleAsyncInit(client);

      // First activation: scope present, internal owns refresh.
      const { activate } = installMockDeviceTokenManager(client, { activated: true });
      const coordinator = getCoordinator(client);
      const user = getPrivate<{ user: User }>(client, '_deps').user;
      const session = getPrivate(client, '_clientSession');

      await coordinator.activate(user, session);
      expect(coordinator.developerRefreshArmed).toBe(false);

      // Simulate reconnect rearming the developer timer (onBeforeReconnect).
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 60_000);
      expect(coordinator.developerRefreshArmed).toBe(true);

      // Re-activation after reconnect: this time the manager declines.
      activate.mockResolvedValueOnce({ activated: false, reason: 'no-scope' });
      await coordinator.activate(user, session);

      // The developer timer must remain armed for the re-authenticated session.
      expect(coordinator.developerRefreshArmed).toBe(true);
    });

    it('cancels developer refresh when reconnect activation succeeds', async () => {
      const provider = createProvider({ withRefresh: true, expiresInMs: 60_000 });
      const client = createClient(provider);
      await settleAsyncInit(client);

      const { activate } = installMockDeviceTokenManager(client, {
        activated: false,
        reason: 'no-scope'
      });
      const coordinator = getCoordinator(client);
      const user = getPrivate<{ user: User }>(client, '_deps').user;
      const session = getPrivate(client, '_clientSession');

      await coordinator.activate(user, session);
      expect(coordinator.developerRefreshArmed).toBe(true);

      // Reconnect with new credential that now has scope.
      coordinator.scheduleDeveloperRefresh(provider, Date.now() + 120_000);
      activate.mockResolvedValueOnce({ activated: true });
      await coordinator.activate(user, session);

      expect(coordinator.developerRefreshArmed).toBe(false);
    });
  });

  // ==========================================================================
  // warnings$ observable
  // ==========================================================================

  describe('warnings$', () => {
    it('emits credential_refresh_fallback when activation declines (no-scope)', async () => {
      const provider = createProvider({ withRefresh: true, expiresInMs: 60_000 });
      const client = createClient(provider);
      await settleAsyncInit(client);

      installMockDeviceTokenManager(client, { activated: false, reason: 'no-scope' });

      // Subscribe BEFORE driving the seam so the emission is captured.
      const warningsPromise = firstValueFrom(client.warnings$.pipe(take(1), toArray()));

      await getCoordinator(client).activate(
        getPrivate<{ user: User }>(client, '_deps').user,
        getPrivate(client, '_clientSession')
      );

      const warnings = await warningsPromise;
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject<Partial<SDKWarning>>({
        code: 'credential_refresh_fallback',
        source: 'CredentialProvider',
        reason: 'no-scope'
      });
    });

    it('emits credential_no_refresh_handler when expiry_at is set but refresh is missing', async () => {
      const provider = createProvider({ withRefresh: false, expiresInMs: 60_000 });
      const client = createClient(provider);

      // ReplaySubject(10) captures warnings emitted during construction even
      // if the subscription happens slightly later.
      const warningsPromise = firstValueFrom(client.warnings$.pipe(take(1), toArray()));
      await settleAsyncInit(client);

      const warnings = await warningsPromise;
      expect(warnings[0]).toMatchObject<Partial<SDKWarning>>({
        code: 'credential_no_refresh_handler',
        source: 'CredentialProvider'
      });
    });

    it('does NOT emit on errors$ for refresh fallback (separate channels)', async () => {
      const provider = createProvider({ withRefresh: true, expiresInMs: 60_000 });
      const client = createClient(provider);
      await settleAsyncInit(client);

      installMockDeviceTokenManager(client, { activated: false, reason: 'no-scope' });

      const errorEvents: Error[] = [];
      const sub = client.errors$.subscribe((e) => errorEvents.push(e));

      try {
        await getCoordinator(client).activate(
          getPrivate<{ user: User }>(client, '_deps').user,
          getPrivate(client, '_clientSession')
        );
      } finally {
        sub.unsubscribe();
      }

      expect(errorEvents).toEqual([]);
    });
  });
});
