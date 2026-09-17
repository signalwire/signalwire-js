import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AttachManager } from './AttachManager';
import { CallCreateError, JSONRPCError } from '../core/errors';

import type { StorageManager } from './StorageManager';
import type { DeviceController } from '../interfaces/DeviceController';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockStorageManager(): StorageManager {
  const store: Record<string, unknown> = {};
  return {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    })
  } as unknown as StorageManager;
}

function createMockDeviceController(): DeviceController {
  return {
    selectedAudioInputDevice: { deviceId: 'mic-1', label: 'Mic', kind: 'audioinput' },
    selectedVideoInputDevice: { deviceId: 'cam-1', label: 'Cam', kind: 'videoinput' },
    deviceInfoToConstraints: vi.fn().mockReturnValue({})
  } as unknown as DeviceController;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AttachManager', () => {
  let storage: StorageManager;
  let deviceController: DeviceController;
  let attachManager: AttachManager;
  /**
   * Whether a credential recovery has been verified. Defaults to false — the
   * state a client is in when nothing has re-credentialed the session — so
   * every test that does not opt in exercises the protective branch.
   */
  let credentialRecovered: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createMockStorageManager();
    deviceController = createMockDeviceController();
    credentialRecovered = false;
    attachManager = new AttachManager(
      storage,
      deviceController,
      5 * 60 * 1000,
      'sw:attached',
      () => credentialRecovered
    );
  });

  // -------------------------------------------------------------------------
  // attach / detach lifecycle
  // -------------------------------------------------------------------------

  describe('attach / detach lifecycle', () => {
    it('should persist call data to storage on attach', async () => {
      await attachManager.attach({
        id: 'call-1',
        to: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'sendrecv' }
      });

      expect(storage.setItem).toHaveBeenCalled();
      const storedData = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(storedData['call-1']).toBeDefined();
      expect(storedData['call-1'].destination).toBe('/public/room');
    });

    it('should skip attach for calls with no destination', async () => {
      await attachManager.attach({
        id: 'call-1',
        to: undefined,
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });

      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('should remove call from storage on detach', async () => {
      // First attach
      await attachManager.attach({
        id: 'call-1',
        to: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });

      // Then detach
      await attachManager.detach({
        id: 'call-1',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });

      const lastWrite = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      expect(lastWrite['call-1']).toBeUndefined();
    });

    it('should detach all calls', async () => {
      const attached = {
        'call-1': {
          destination: '/public/room1',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        },
        'call-2': {
          destination: '/public/room2',
          mediaDirections: { audio: 'sendrecv', video: 'sendrecv' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(attached);

      await attachManager.detachAll();

      // Should have written empty or without those call IDs
      expect(storage.setItem).toHaveBeenCalled();
    });

    it('should flush all attached calls', async () => {
      await attachManager.flush();
      expect(storage.setItem).toHaveBeenCalledWith('sw:attached', {});
    });
  });

  // -------------------------------------------------------------------------
  // refresh — the verto.ping keepalive
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    it('keeps an existing record alive and current', async () => {
      await attachManager.attach({
        id: 'call-1',
        to: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'sendrecv' }
      });
      const attachedAt = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1][
        'call-1'
      ].attachedAt;

      vi.setSystemTime(attachedAt + 60_000);
      await attachManager.refresh({
        id: 'call-1',
        to: '/public/room',
        // Gone receive-only mid-call — a reattach must not reopen the mic.
        mediaDirections: { audio: 'recvonly', video: 'recvonly' }
      });

      const stored = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1]['call-1'];
      expect(stored.attachedAt).toBe(attachedAt + 60_000);
      expect(stored.mediaDirections).toEqual({ audio: 'recvonly', video: 'recvonly' });
      vi.useRealTimers();
    });

    it('does not revive a record that was already detached', async () => {
      // The bye() → detach → ping race: a ping still in flight when the call
      // ends must not put the hung-up call back in the reattach map, or the
      // next page load dials a call nobody is on.
      await attachManager.attach({
        id: 'call-1',
        to: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'sendrecv' }
      });
      await attachManager.detach({
        id: 'call-1',
        mediaDirections: { audio: 'sendrecv', video: 'sendrecv' }
      });

      await attachManager.refresh({
        id: 'call-1',
        to: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'sendrecv' }
      });

      const lastWrite = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      expect(lastWrite['call-1']).toBeUndefined();
    });

    it('leaves other calls untouched', async () => {
      await attachManager.attach({
        id: 'call-1',
        to: '/public/room1',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });
      await attachManager.attach({
        id: 'call-2',
        to: '/public/room2',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });

      await attachManager.refresh({
        id: 'call-1',
        to: '/public/room1',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' }
      });

      const lastWrite = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1];
      expect(Object.keys(lastWrite).sort()).toEqual(['call-1', 'call-2']);
      expect(lastWrite['call-2'].destination).toBe('/public/room2');
    });
  });

  // -------------------------------------------------------------------------
  // reattachCalls — client-initiated verto.invite with reattaching: true
  // -------------------------------------------------------------------------

  describe('reattachCalls', () => {
    it('should call createOutboundCall for each stored call', async () => {
      const mockSession = {
        createOutboundCall: vi.fn().mockResolvedValue({ id: 'call-1' })
      };
      attachManager.setSession(mockSession);

      const attached = {
        'call-1': {
          destination: '/public/room',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(attached);

      await attachManager.reattachCalls();

      expect(mockSession.createOutboundCall).toHaveBeenCalledWith(
        '/public/room',
        expect.objectContaining({
          callId: 'call-1',
          reattach: true,
          receiveAudio: true
        })
      );
    });

    it('should pass correct media options from stored attachment', async () => {
      const mockSession = {
        createOutboundCall: vi.fn().mockResolvedValue({ id: 'call-1' })
      };
      attachManager.setSession(mockSession);

      const attached = {
        'call-1': {
          destination: '/public/video-room',
          mediaDirections: { audio: 'sendrecv', video: 'sendrecv' },
          audioInputDevice: { deviceId: 'mic-1', label: 'Mic', kind: 'audioinput' },
          videoInputDevice: { deviceId: 'cam-1', label: 'Cam', kind: 'videoinput' },
          attachedAt: Date.now()
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(attached);

      await attachManager.reattachCalls();

      const callOptions = mockSession.createOutboundCall.mock.calls[0][1];
      expect(callOptions.receiveAudio).toBe(true);
      expect(callOptions.receiveVideo).toBe(true);
      expect(callOptions.reattach).toBe(true);
    });

    it('should handle reattach failure gracefully and clean up stale reference after retries', async () => {
      // Exhausting the retries is necessary but no longer sufficient to drop
      // the record — the denial must also follow a verified reauthentication,
      // so this test opts in to that state. The case where it has NOT happened
      // is covered in 'reattachCalls — cleaning up attach records'.
      credentialRecovered = true;
      const mockSession = {
        createOutboundCall: vi.fn().mockRejectedValue(new Error('INVALID_CALL_REFERENCE'))
      };
      attachManager.setSession(mockSession);

      const attached = {
        'dead-call': {
          destination: '/public/room',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(attached);

      // Should not throw (retries 3 times then cleans up)
      await expect(attachManager.reattachCalls()).resolves.toBeUndefined();

      // Should have retried 3 times then cleaned up the stale reference
      expect(mockSession.createOutboundCall).toHaveBeenCalledTimes(3);
      expect(storage.setItem).toHaveBeenCalled();
    }, 10_000);

    it('should reattach multiple calls', async () => {
      const mockSession = {
        createOutboundCall: vi.fn().mockResolvedValue({ id: 'any' })
      };
      attachManager.setSession(mockSession);

      const attached = {
        'call-a': {
          destination: '/public/room-a',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        },
        'call-b': {
          destination: '/public/room-b',
          mediaDirections: { audio: 'sendrecv', video: 'sendrecv' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now()
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(attached);

      await attachManager.reattachCalls();

      expect(mockSession.createOutboundCall).toHaveBeenCalledTimes(2);
    });

    it('should skip expired calls during reattach', async () => {
      const mockSession = {
        createOutboundCall: vi.fn().mockResolvedValue({ id: 'any' })
      };
      attachManager.setSession(mockSession);

      const expired = {
        'expired-call': {
          destination: '/public/room',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' },
          audioInputDevice: null,
          videoInputDevice: null,
          attachedAt: Date.now() - 10 * 60 * 1000 // 10 minutes ago, beyond 5 min timeout
        }
      };
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expired);

      await attachManager.reattachCalls();

      // Expired call should have been cleaned up, not reattached
      // (detachExpired runs first, then the loop has nothing to iterate)
    });
  });

  // -------------------------------------------------------------------------
  // Storage error resilience
  // -------------------------------------------------------------------------


  // -------------------------------------------------------------------------
  // Contract (2026-09-03) — do not retry a credential rejection
  //
  // Traced from a staging failure: after a page reload the session could not
  // register (`subscriber.online` refused with -32003), so every reattach invite
  // was refused for the same reason. The loop still spent all three attempts and
  // ~5s of backoff on a session that could not register. Retrying the same call
  // cannot fix a credential the server is refusing; recovery belongs to the
  // credential path, not here.
  // -------------------------------------------------------------------------

  describe('reattachCalls — credential rejections are not retried', () => {
    const storedCall = () => ({
      'call-1': {
        destination: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' },
        audioInputDevice: null,
        videoInputDevice: null,
        attachedAt: Date.now()
      }
    });

    it('stops after the first attempt when the call is refused on credentials', async () => {
      const refusal = new CallCreateError(
        'Call creation failed',
        new JSONRPCError(-32003, 'Requester validation failed'),
        'outbound'
      );
      const mockSession = { createOutboundCall: vi.fn().mockRejectedValue(refusal) };
      attachManager.setSession(mockSession);
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(storedCall());

      // Fake timers so the current backoff does not make this a timeout
      // instead of a clean statement about the attempt count.
      vi.useFakeTimers();
      try {
        const pending = attachManager.reattachCalls();
        await vi.advanceTimersByTimeAsync(10_000);
        await pending;
      } finally {
        vi.useRealTimers();
      }

      expect(
        mockSession.createOutboundCall,
        'a refused credential cannot be healed by trying the same call again'
      ).toHaveBeenCalledTimes(1);
    });

    it('still retries a -32002, which the server overloads for call errors', async () => {
      // Observed on a rejected reattach: -32002 with cause
      // INVALID_MSG_UNSPECIFIED and message "CALL ERROR". That is a call-level
      // rejection, so it must not be read as the credential being refused.
      const refusal = new CallCreateError(
        'Call creation failed',
        new JSONRPCError(-32002, 'CALL ERROR'),
        'outbound'
      );
      const mockSession = { createOutboundCall: vi.fn().mockRejectedValue(refusal) };
      attachManager.setSession(mockSession);
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(storedCall());

      // Fake timers so the current backoff does not make this a timeout
      // instead of a clean statement about the attempt count.
      vi.useFakeTimers();
      try {
        const pending = attachManager.reattachCalls();
        await vi.advanceTimersByTimeAsync(10_000);
        await pending;
      } finally {
        vi.useRealTimers();
      }

      expect(mockSession.createOutboundCall).toHaveBeenCalledTimes(3);
    });

    it('still retries three times for a failure a retry could fix', async () => {
      // Guard against over-correcting: a transient signaling or network failure
      // keeps the existing backoff-and-retry behaviour.
      vi.useFakeTimers();
      try {
        const mockSession = {
          createOutboundCall: vi.fn().mockRejectedValue(new Error('temporary signaling failure'))
        };
        attachManager.setSession(mockSession);
        (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(storedCall());

        const pending = attachManager.reattachCalls();
        await vi.advanceTimersByTimeAsync(10_000);
        await pending;

        expect(mockSession.createOutboundCall).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Cleaning up attach records
  //
  // An attach record is the only way a later reload can try the call again, so
  // a failed reattach must not cost it. It is dropped only when the server
  // denied the reattach on a credential it had already accepted — i.e. after a
  // *verified* reauthentication. Staging run 33826974634 is the case this
  // protects: the reattach was refused -32003 while the session credential was
  // still being refused.
  // -------------------------------------------------------------------------

  describe('reattachCalls — cleaning up attach records', () => {
    const storedCall = () => ({
      'call-1': {
        destination: '/public/room',
        mediaDirections: { audio: 'sendrecv', video: 'inactive' },
        audioInputDevice: null,
        videoInputDevice: null,
        attachedAt: Date.now()
      }
    });

    /** The attached-calls map as last written to storage. */
    function lastWrittenMap(): Record<string, unknown> {
      const calls = (storage.setItem as ReturnType<typeof vi.fn>).mock.calls;
      return calls[calls.length - 1][1] as Record<string, unknown>;
    }

    async function runReattach(error: Error): Promise<void> {
      const mockSession = { createOutboundCall: vi.fn().mockRejectedValue(error) };
      attachManager.setSession(mockSession);
      (storage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(storedCall());
      vi.useFakeTimers();
      try {
        const pending = attachManager.reattachCalls();
        await vi.advanceTimersByTimeAsync(10_000);
        await pending;
      } finally {
        vi.useRealTimers();
      }
    }

    it('keeps the record when a credential refusal was never healed', async () => {
      const refusal = new CallCreateError(
        'Call creation failed',
        new JSONRPCError(-32003, 'Requester validation failed'),
        'outbound'
      );

      await runReattach(refusal);

      expect(
        lastWrittenMap(),
        'the credential is what the server refused, so the call may still be there'
      ).toHaveProperty('call-1');
    });

    it('keeps the record when a transient failure exhausts the retries', async () => {
      await runReattach(new Error('temporary signaling failure'));

      expect(lastWrittenMap()).toHaveProperty('call-1');
    });

    it('drops the record when the denial follows a verified reauthentication', async () => {
      credentialRecovered = true;

      await runReattach(
        new CallCreateError(
          'Call creation failed',
          new JSONRPCError(-32002, 'CALL ERROR'),
          'outbound'
        )
      );

      expect(
        lastWrittenMap(),
        'the credential was accepted, so the refusal is about the call'
      ).not.toHaveProperty('call-1');
    });

    it('keeps the record when a credential refusal follows a verified reauthentication', async () => {
      // A recovery earlier in this init verified the credential (latch on), but the
      // reattach itself is now refused with -32003 — the credential went stale again.
      // A refused credential is never proof the call is gone, so the record must
      // survive for a later reload to retry; discarding it here loses a live call.
      credentialRecovered = true;

      await runReattach(
        new CallCreateError(
          'Call creation failed',
          new JSONRPCError(-32003, 'Requester validation failed'),
          'outbound'
        )
      );

      expect(
        lastWrittenMap(),
        'the credential is what the server refused, so the call may still be there'
      ).toHaveProperty('call-1');
    });
  });

  describe('storage error resilience', () => {
    it('should handle storage read errors gracefully', async () => {
      (storage.getItem as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('storage read error')
      );

      await expect(
        attachManager.attach({
          id: 'call-1',
          to: '/public/room',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' }
        })
      ).resolves.toBeUndefined();
    });

    it('should handle storage write errors gracefully', async () => {
      (storage.setItem as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('storage write error')
      );

      await expect(
        attachManager.attach({
          id: 'call-1',
          to: '/public/room',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' }
        })
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Concurrent mutation serialization
  // -------------------------------------------------------------------------

  describe('concurrent mutations', () => {
    it('should not lose entries when attach calls run concurrently', async () => {
      // Force the storage read to be slow so the race window is wide.
      const realGet = storage.getItem as ReturnType<typeof vi.fn>;
      const slowStore: Record<string, unknown> = {};
      realGet.mockImplementation(async (key: string) => {
        await new Promise((r) => setTimeout(r, 5));
        return slowStore[key] ?? null;
      });
      (storage.setItem as ReturnType<typeof vi.fn>).mockImplementation(
        async (key: string, value: unknown) => {
          slowStore[key] = value;
        }
      );

      await Promise.all([
        attachManager.attach({
          id: 'call-a',
          to: '/room/a',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' }
        }),
        attachManager.attach({
          id: 'call-b',
          to: '/room/b',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' }
        }),
        attachManager.attach({
          id: 'call-c',
          to: '/room/c',
          mediaDirections: { audio: 'sendrecv', video: 'inactive' }
        })
      ]);

      const final = slowStore['sw:attached'] as Record<string, unknown>;
      expect(Object.keys(final).sort()).toEqual(['call-a', 'call-b', 'call-c']);
    });
  });
});
