import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { MediaAccessError } from '../core/errors';
import {
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCPeerConnection
} from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { ScreenShareStatus } from './types/verto-manager.types';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * Tests for non-fatal media-access handling on auxiliary peer connections
 * (screenshare and additional-device):
 * - a getDisplayMedia/getUserMedia failure never destroys the call
 * - onError receives the typed MediaAccessError once, flagged non-fatal
 * - the public method rejects with the ORIGINAL error (not RxJS EmptyError)
 * - destroying while connecting is a benign cancel (no error, no rejection)
 * - screenShareStatus$ transitions are gated to the screenshare propose
 */

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const createDomException = (name: string, message = 'Permission denied'): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const createMockDeviceController = (): DeviceController =>
  ({
    selectedAudioInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedVideoInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn(() => ({}))
  }) as unknown as DeviceController;

const createMockCallSession = (): WebRTCCall =>
  ({
    id: 'main-call-id',
    to: '/public/test-room',
    from: 'caller',
    fromName: 'Caller',
    toName: 'Test Room',
    userVariables: {},
    options: { audio: false, video: false, receiveAudio: true },
    clientSession: { iceServers: [] },
    webrtcMessages$: new Subject(),
    callEvent$: new Subject(),
    answered$: new Subject(),
    mediaDirections: { audio: 'inactive', video: 'inactive' },
    execute: vi.fn(() => new Promise(() => {})),
    addCallId: vi.fn(),
    emitMediaParamsUpdated: vi.fn(),
    destroy: vi.fn()
  }) as unknown as WebRTCCall;

const createMockAttachManager = (): AttachManager =>
  ({
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined)
  }) as unknown as AttachManager;

interface Fixture {
  vertoManager: WebRTCVertoManager;
  callSession: WebRTCCall;
  onError: ReturnType<typeof vi.fn>;
  pcInstances: MockRTCPeerConnection[];
  getDisplayMedia: ReturnType<typeof vi.fn>;
  getUserMedia: ReturnType<typeof vi.fn>;
  statuses: ScreenShareStatus[];
}

const createFixture = (overrides?: {
  getDisplayMedia?: ReturnType<typeof vi.fn>;
  getUserMedia?: ReturnType<typeof vi.fn>;
}): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const MockPeerConnectionConstructor = vi.fn(function (this: unknown, config?: RTCConfiguration) {
    const pc = new MockRTCPeerConnection(config);
    pcInstances.push(pc);
    return pc as unknown as RTCPeerConnection;
  });

  const getUserMedia =
    overrides?.getUserMedia ??
    vi.fn(async (constraints: MediaStreamConstraints) => {
      const tracks: MockMediaStreamTrack[] = [];
      if (constraints.audio) {
        tracks.push(new MockMediaStreamTrack('audio'));
      }
      if (constraints.video) {
        tracks.push(new MockMediaStreamTrack('video'));
      }
      return new MockMediaStream(tracks) as unknown as MediaStream;
    });

  const getDisplayMedia =
    overrides?.getDisplayMedia ??
    vi.fn(async () => {
      return new MockMediaStream([new MockMediaStreamTrack('video')]) as unknown as MediaStream;
    });

  const webRTCApiProvider = {
    RTCPeerConnection: MockPeerConnectionConstructor as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia,
      getDisplayMedia,
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const onError = vi.fn();
  const callSession = createMockCallSession();

  const vertoManager = new WebRTCVertoManager(
    callSession,
    createMockAttachManager(),
    createMockDeviceController(),
    webRTCApiProvider,
    { onError }
  );

  const statuses: ScreenShareStatus[] = [];
  vertoManager.screenShareStatus$.subscribe((status) => statuses.push(status));

  return { vertoManager, callSession, onError, pcInstances, getDisplayMedia, getUserMedia, statuses };
};

/** Poll until `predicate` is true (real timers). */
const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCVertoManager - auxiliary peer connection media failures', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  describe('screenshare cancel (getDisplayMedia rejects with NotAllowedError)', () => {
    it('rejects addScreenMedia with the ORIGINAL error and does not destroy the call', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('forwards a single typed MediaAccessError to onError, flagged non-fatal', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.onError).toHaveBeenCalledTimes(1);
      const [forwarded, options] = fixture.onError.mock.calls[0] as [
        MediaAccessError,
        { fatal?: boolean } | undefined
      ];
      expect(forwarded).toBeInstanceOf(MediaAccessError);
      expect(forwarded.fatal).toBe(false);
      expect(forwarded.operation).toBe('startScreenShare');
      expect(forwarded.media).toBe('screen');
      expect(forwarded.originalError).toBe(original);
      expect(forwarded.denied).toBe(true);
      // Auxiliary errors are explicitly flagged non-fatal for the call
      expect(options).toEqual({ fatal: false });
    });

    it('transitions screenShareStatus$ starting → none', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.statuses).toEqual(['none', 'starting', 'none']);
      expect(fixture.vertoManager.screenShareStatus).toBe('none');
    });
  });

  describe('screenshare success', () => {
    it('resolves and reaches started when the connection connects', async () => {
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();

      // Wait for the aux peer connection (index 1; index 0 is main) to be
      // listening for connection state changes, then simulate 'connected'.
      await waitFor(
        () => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false
      );
      fixture.pcInstances[1].simulateConnectionStateChange('connected');

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.vertoManager.screenShareStatus).toBe('started');
      expect(fixture.onError).not.toHaveBeenCalled();
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });
  });

  describe('destroy while connecting (benign cancel)', () => {
    it('resolves quietly without onError when the manager is destroyed mid-connect', async () => {
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();

      // Wait until the aux connection exists, then hang up before 'connected'
      await waitFor(
        () => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false
      );
      fixture.vertoManager.destroy();

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.onError).not.toHaveBeenCalled();
    });
  });

  describe('screenshare connection timeout', () => {
    it('rejects without calling onError and resets status to none', async () => {
      vi.useFakeTimers();
      try {
        fixture = createFixture();

        const promise = fixture.vertoManager.addScreenMedia();
        const assertion = expect(promise).rejects.toThrow();

        await vi.advanceTimersByTimeAsync(60_000);

        await assertion;
        expect(fixture.onError).not.toHaveBeenCalled();
        expect(fixture.vertoManager.screenShareStatus).toBe('none');
        expect(fixture.callSession.destroy).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('additional-device (getUserMedia rejects with NotAllowedError)', () => {
    const createFixtureWithDeniedCamera = (original: Error): Fixture =>
      createFixture({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video) {
            return Promise.reject(original);
          }
          return new MockMediaStream([]) as unknown as MediaStream;
        })
      });

    it('rejects addInputDevice with the ORIGINAL error and does not destroy the call', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: false, video: true })).rejects.toBe(
        original
      );

      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('forwards a single non-fatal MediaAccessError with addInputDevice operation', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: false, video: true })).rejects.toBe(
        original
      );

      expect(fixture.onError).toHaveBeenCalledTimes(1);
      const forwarded = fixture.onError.mock.calls[0][0] as MediaAccessError;
      expect(forwarded).toBeInstanceOf(MediaAccessError);
      expect(forwarded.fatal).toBe(false);
      expect(forwarded.operation).toBe('addInputDevice');
      expect(forwarded.media).toBe('video');
      expect(forwarded.originalError).toBe(original);
    });

    it('reports media audiovideo when both kinds were requested', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: true, video: true })).rejects.toBe(
        original
      );

      const forwarded = fixture.onError.mock.calls[0][0] as MediaAccessError;
      expect(forwarded.media).toBe('audiovideo');
    });

    it('does not touch screenShareStatus$', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(
        fixture.vertoManager.addInputDevice({ audio: false, video: true })
      ).rejects.toBe(original);

      expect(fixture.statuses).toEqual(['none']);
    });
  });
});
