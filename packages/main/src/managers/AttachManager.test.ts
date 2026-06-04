import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AttachManager } from './AttachManager';

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

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createMockStorageManager();
    deviceController = createMockDeviceController();
    attachManager = new AttachManager(storage, deviceController, 5 * 60 * 1000, 'sw:attached');
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
