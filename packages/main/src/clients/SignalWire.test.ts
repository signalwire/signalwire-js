import { describe, it, expect, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';

import { SignalWire } from './SignalWire';
import { StaticCredentialProvider } from '../dependencies/StaticCredentialProvider';

import type { WebRTCApiProvider } from '../dependencies/interfaces';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Use authorizationState to skip JWT decode entirely.
const FAKE_CREDENTIAL = { authorizationState: 'test-auth-state' };

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

function createClient(): SignalWire {
  return new SignalWire(new StaticCredentialProvider(FAKE_CREDENTIAL), {
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

function injectMockUser(client: SignalWire): void {
  const mock = { id: 'sub-test', fetched$: of(true) };
  getPrivate<BehaviorSubject<unknown>>(client, '_user$').next(mock);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignalWire', () => {
  describe('disconnect → connect reconnect flow', () => {
    it('isConnected$ starts as false with skipConnection', async () => {
      const client = createClient();
      expect(await firstValueFrom(client.isConnected$)).toBe(false);
    });

    it('isConnected$ is NOT completed by disconnect()', async () => {
      const client = createClient();

      let completed = false;
      const sub = client.isConnected$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      try {
        await client.disconnect();
      } catch {
        /* no session to disconnect */
      }

      expect(completed).toBe(false);
      sub.unsubscribe();
    });

    it('errors$ is NOT completed by disconnect()', async () => {
      const client = createClient();

      let completed = false;
      const sub = client.errors$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      try {
        await client.disconnect();
      } catch {
        /* expected */
      }

      expect(completed).toBe(false);
      sub.unsubscribe();
    });

    it('_isConnected$ subject still accepts values after disconnect()', () => {
      const client = createClient();
      const subject = getPrivate<BehaviorSubject<boolean>>(client, '_isConnected$');

      const values: boolean[] = [];
      const sub = subject.subscribe((v) => values.push(v));

      expect(values).toEqual([false]);

      // Simulate disconnect → connect cycle on the raw subject
      subject.next(false); // disconnect sets false
      subject.next(true); // connect sets true

      expect(values).toEqual([false, false, true]);
      sub.unsubscribe();
    });

    it('connect() creates new _clientSession and _transport each time', async () => {
      const client = createClient();
      injectMockUser(client);

      // Before connect: nothing initialized
      expect(getPrivate(client, '_clientSession')).toBeUndefined();

      // First connect — will create transport + session, then fail because
      // the mock WS can't authenticate (TimeoutError from the auth gate).
      try {
        await client.connect();
      } catch {
        /* WS connect or auth gate timeout */
      }

      const session1 = getPrivate(client, '_clientSession');
      const transport1 = getPrivate(client, '_transport');
      expect(session1).toBeDefined();
      expect(transport1).toBeDefined();

      // Disconnect destroys the old session
      try {
        await client.disconnect();
      } catch {
        /* ok */
      }

      // Second connect — must create DIFFERENT instances
      injectMockUser(client);
      try {
        await client.connect();
      } catch {
        /* WS fails again */
      }

      const session2 = getPrivate(client, '_clientSession');
      const transport2 = getPrivate(client, '_transport');
      expect(session2).toBeDefined();
      expect(transport2).toBeDefined();
      expect(session2).not.toBe(session1);
      expect(transport2).not.toBe(transport1);
    }, 35000); // Allow time for auth gate timeout (15s × 2 connect attempts)
  });
});
