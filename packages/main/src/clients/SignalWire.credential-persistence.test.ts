/**
 * Client-bound SAT reload survival: the bound token installed by
 * DeviceTokenManager flows through the coordinator's `store.merge`. It must
 * be PERSISTED — not just merged in memory — so a page reload resumes with
 * the freshest SAT instead of the original (possibly expired) base SAT.
 * The persisted token is useless without the DPoP key (IndexedDB), which is
 * exactly the binding's theft protection.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

import { SignalWire } from './SignalWire';

import type { CredentialStore } from '../managers/CredentialRefreshCoordinator';
import type { CredentialRefreshCoordinator } from '../managers/CredentialRefreshCoordinator';
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

/** Structurally-valid JWT so construction-time header decoding succeeds. */
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyIn0.signature';

function createProvider(): CredentialProvider {
  return {
    authenticate: vi.fn().mockResolvedValue({ token: FAKE_JWT, expiry_at: Date.now() + 60_000 })
  };
}

function getPrivate<T>(obj: unknown, field: string): T {
  return (obj as Record<string, unknown>)[field] as T;
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

function coordinatorStore(client: SignalWire): CredentialStore {
  const coordinator = getPrivate<CredentialRefreshCoordinator>(client, '_refreshCoordinator');
  return getPrivate<{ store: CredentialStore }>(coordinator, 'deps').store;
}

// ---------------------------------------------------------------------------
// store.merge persistence
// ---------------------------------------------------------------------------

describe('credential store merge (client-bound SAT reload survival)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the merged credential so a bound SAT survives a page reload', async () => {
    const storage = createMockStorage();
    const client = new SignalWire(createProvider(), {
      skipConnection: true,
      skipRegister: true,
      skipDeviceMonitoring: true,
      webRTCApiProvider: createMockWebRTCApiProvider(),
      storageImplementation: storage
    });
    await settleAsyncInit(client);
    storage.setItem.mockClear();

    coordinatorStore(client).merge({ token: 'bound-sat' });

    const cachedWrites = storage.setItem.mock.calls.filter(([key]) =>
      String(key).includes('cached_credential')
    );
    expect(cachedWrites.length).toBeGreaterThan(0);
    expect(cachedWrites.some(([, value]) => JSON.stringify(value).includes('bound-sat'))).toBe(
      true
    );
  });

  it('merges into the in-memory credential without dropping existing fields', async () => {
    const client = new SignalWire(createProvider(), {
      skipConnection: true,
      skipRegister: true,
      skipDeviceMonitoring: true,
      webRTCApiProvider: createMockWebRTCApiProvider(),
      storageImplementation: createMockStorage()
    });
    await settleAsyncInit(client);
    const before = getPrivate<{ credential: SDKCredential }>(client, '_deps').credential;

    coordinatorStore(client).merge({ token: 'bound-sat' });

    const after = getPrivate<{ credential: SDKCredential }>(client, '_deps').credential;
    expect(after.token).toBe('bound-sat');
    expect(after.expiry_at).toBe(before.expiry_at);
  });
});
