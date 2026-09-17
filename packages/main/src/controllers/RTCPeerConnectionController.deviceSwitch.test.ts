import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RTCPeerConnectionController } from './RTCPeerConnectionController';

import type { DeviceController } from '../interfaces/DeviceController';

// ---------------------------------------------------------------------------
// `updateSelectedInputDevice` is private and is wired up inside `doInit()`,
// which needs a live peer connection. These tests drive it directly so the
// acquire/release ordering can be observed without standing up negotiation.
// ---------------------------------------------------------------------------

vi.mock('./LocalAudioPipeline', () => {
  class MockLocalAudioPipeline {
    public setInputTrack = vi.fn();
    public outputTrack = { id: 'pipeline-output', kind: 'audio' } as MediaStreamTrack;
    public destroy = vi.fn();
    public level$ = new BehaviorSubject<number>(0);
    public speaking$ = new BehaviorSubject<boolean>(false);
    public gain$ = new BehaviorSubject<number>(1);
  }
  return { LocalAudioPipeline: MockLocalAudioPipeline };
});

function createMockDeviceController(): DeviceController {
  return {
    audioInputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    audioOutputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    videoInputDevices$: new BehaviorSubject<MediaDeviceInfo[]>([]),
    selectedAudioInputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectedAudioOutputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectedVideoInputDevice$: new BehaviorSubject<MediaDeviceInfo | null>(null),
    selectedAudioInputDevice: null,
    selectedAudioOutputDevice: null,
    selectedVideoInputDevice: null,
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn((info: MediaDeviceInfo | null) =>
      info?.deviceId ? { deviceId: info.deviceId } : {}
    ),
    selectAudioInputDevice: vi.fn(),
    selectVideoInputDevice: vi.fn(),
    selectAudioOutputDevice: vi.fn(),
    enableDeviceMonitoring: vi.fn(),
    disableDeviceMonitoring: vi.fn(),
    errors$: new BehaviorSubject<Error>(null as unknown as Error).asObservable(),
    getDeviceCapabilities: vi.fn().mockResolvedValue(null),
    isValidDevice: vi.fn().mockResolvedValue(false),
    deviceRecovered$: new BehaviorSubject(null as unknown).asObservable(),
    disableAudioInput: vi.fn(),
    enableAudioInput: vi.fn(),
    disableVideoInput: vi.fn(),
    enableVideoInput: vi.fn(),
    videoInputDisabled$: new BehaviorSubject<boolean>(false).asObservable(),
    audioInputDisabled$: new BehaviorSubject<boolean>(false).asObservable(),
    videoInputDisabled: false,
    audioInputDisabled: false,
    setStorageManager: vi.fn(),
    clearDeviceState: vi.fn().mockResolvedValue(undefined),
    enumerateDevices: vi.fn().mockResolvedValue(undefined)
  } as unknown as DeviceController;
}

interface FakeTrack {
  id: string;
  kind: 'audio' | 'video';
  readyState: 'live' | 'ended';
  stop: ReturnType<typeof vi.fn>;
  getConstraints: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

function createFakeTrack(id: string, kind: 'audio' | 'video', deviceId = `${id}-device`): FakeTrack {
  const track: FakeTrack = {
    id,
    kind,
    readyState: 'live',
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
    getConstraints: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({ deviceId })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  return track;
}

function createFakeStream(initial: FakeTrack[]): MediaStream {
  const tracks = [...initial];
  return {
    getTracks: () => [...tracks],
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    addTrack: (t: FakeTrack) => {
      if (!tracks.includes(t)) tracks.push(t);
    },
    removeTrack: (t: FakeTrack) => {
      const index = tracks.indexOf(t);
      if (index >= 0) tracks.splice(index, 1);
    }
  } as unknown as MediaStream;
}

function deviceInfo(deviceId: string, kind: 'audioinput' | 'videoinput'): MediaDeviceInfo {
  return { deviceId, kind, label: `${deviceId} label`, groupId: 'g' } as MediaDeviceInfo;
}

function notReadable(): Error {
  const error = new Error('device in use');
  error.name = 'NotReadableError';
  return error;
}

function overconstrained(): Error {
  const error = new Error('stale id');
  error.name = 'OverconstrainedError';
  return error;
}

describe('RTCPeerConnectionController device switching', () => {
  let controller: RTCPeerConnectionController;
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let replaceSenderTrackSpy: ReturnType<typeof vi.fn>;
  let stopTrackSenderSpy: ReturnType<typeof vi.fn>;
  let senderTrack: FakeTrack | null;
  let localStream: MediaStream;

  beforeEach(() => {
    getUserMediaMock = vi.fn();
    senderTrack = null;

    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: { getUserMedia: getUserMediaMock } },
      writable: true,
      configurable: true
    });

    controller = new RTCPeerConnectionController({}, undefined, createMockDeviceController());

    replaceSenderTrackSpy = vi.fn(async (_kind: string, track: FakeTrack) => {
      senderTrack = track;
    });
    stopTrackSenderSpy = vi.fn();
    Object.defineProperty(controller, 'transceiverController', {
      value: {
        replaceSenderTrack: replaceSenderTrackSpy,
        stopTrackSender: stopTrackSenderSpy,
        restoreTrackSender: vi.fn().mockResolvedValue(undefined),
        getConstraintsFor: vi.fn(() => ({})),
        audioTransceivers: []
      },
      configurable: true
    });
  });

  function seed(tracks: FakeTrack[]): void {
    localStream = createFakeStream(tracks);
    const lsc = (controller as unknown as { localStreamController: unknown })
      .localStreamController as { _localStream$: BehaviorSubject<MediaStream | null> };
    lsc._localStream$.next(localStream);
    senderTrack = tracks[0] ?? null;
  }

  function switchDevice(kind: 'audio' | 'video', info: MediaDeviceInfo | null): Promise<void> {
    return (
      controller as unknown as {
        updateSelectedInputDevice: (k: string, d: MediaDeviceInfo | null) => Promise<void>;
      }
    ).updateSelectedInputDevice(kind, info);
  }

  function engagePipeline(): { setInputTrack: ReturnType<typeof vi.fn> } {
    const pipeline = {
      setInputTrack: vi.fn(),
      outputTrack: { id: 'pipeline-output', kind: 'audio' } as MediaStreamTrack
    };
    Object.defineProperty(controller, '_localAudioPipeline', {
      value: pipeline,
      writable: true,
      configurable: true
    });
    return pipeline;
  }

  describe('acquire before release', () => {
    it('still has the old track live and sending when getUserMedia is called', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      const fresh = createFakeTrack('mic-new', 'audio');
      let observed: { readyState: string; inStream: boolean; onSender: boolean } | null = null;
      getUserMediaMock.mockImplementation(async () => {
        observed = {
          readyState: old.readyState,
          inStream: localStream.getTracks().includes(old as unknown as MediaStreamTrack),
          onSender: senderTrack === old
        };
        return createFakeStream([fresh]);
      });

      await switchDevice('audio', deviceInfo('mic-new-device', 'audioinput'));

      expect(observed).toEqual({ readyState: 'live', inStream: true, onSender: true });
    });

    it('swaps to the new track and releases the old one on success', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      const fresh = createFakeTrack('mic-new', 'audio');
      getUserMediaMock.mockResolvedValue(createFakeStream([fresh]));

      await switchDevice('audio', deviceInfo('mic-new-device', 'audioinput'));

      expect(senderTrack).toBe(fresh);
      expect(old.stop).toHaveBeenCalled();
      expect(localStream.getTracks()).toContain(fresh as unknown as MediaStreamTrack);
      expect(localStream.getTracks()).not.toContain(old as unknown as MediaStreamTrack);
    });
  });

  describe('failed acquisition', () => {
    it('leaves the current microphone live and sending', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      const denied = new Error('denied');
      denied.name = 'NotAllowedError';
      getUserMediaMock.mockRejectedValue(denied);

      await switchDevice('audio', deviceInfo('mic-new-device', 'audioinput'));

      expect(old.readyState).toBe('live');
      expect(old.stop).not.toHaveBeenCalled();
      expect(senderTrack).toBe(old);
      expect(localStream.getTracks()).toContain(old as unknown as MediaStreamTrack);
    });

    it('leaves the current camera live and sending', async () => {
      const old = createFakeTrack('cam-old', 'video');
      seed([old]);
      const denied = new Error('denied');
      denied.name = 'NotAllowedError';
      getUserMediaMock.mockRejectedValue(denied);

      await switchDevice('video', deviceInfo('cam-new-device', 'videoinput'));

      expect(old.readyState).toBe('live');
      expect(senderTrack).toBe(old);
    });

    it('reports a MediaTrackError rather than rejecting', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      getUserMediaMock.mockRejectedValue(new Error('boom'));
      const errors: Error[] = [];
      const sub = controller.errors$.subscribe((error) => errors.push(error));

      await expect(switchDevice('audio', deviceInfo('x', 'audioinput'))).resolves.toBeUndefined();

      expect(errors.map((e) => e.name)).toContain('MediaTrackError');
      sub.unsubscribe();
    });
  });

  describe('exclusive-hardware retry', () => {
    it('releases the old capture and retries once on NotReadableError', async () => {
      const old = createFakeTrack('cam-old', 'video');
      seed([old]);
      const fresh = createFakeTrack('cam-new', 'video');
      getUserMediaMock
        .mockRejectedValueOnce(notReadable())
        .mockResolvedValueOnce(createFakeStream([fresh]));

      await switchDevice('video', deviceInfo('cam-new-device', 'videoinput'));

      expect(stopTrackSenderSpy).toHaveBeenCalled();
      expect(getUserMediaMock).toHaveBeenCalledTimes(2);
      expect(senderTrack).toBe(fresh);
    });

    it('re-acquires the previous device when the retry also fails', async () => {
      const old = createFakeTrack('cam-old', 'video', 'cam-old-device');
      seed([old]);
      const restored = createFakeTrack('cam-restored', 'video');
      getUserMediaMock
        .mockRejectedValueOnce(notReadable())
        .mockRejectedValueOnce(new Error('still unavailable'))
        .mockResolvedValueOnce(createFakeStream([restored]));
      const errors: Error[] = [];
      const sub = controller.errors$.subscribe((error) => errors.push(error));

      await expect(
        switchDevice('video', deviceInfo('cam-new-device', 'videoinput'))
      ).resolves.toBeUndefined();

      expect(getUserMediaMock).toHaveBeenCalledTimes(3);
      expect(getUserMediaMock.mock.calls[2][0]).toEqual({
        video: expect.objectContaining({ deviceId: { exact: 'cam-old-device' } })
      });
      expect(senderTrack).toBe(restored);
      expect(errors.map((e) => e.name)).toContain('MediaTrackError');
      sub.unsubscribe();
    });

    it('does not retry for a failure that is not exclusive-hardware', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      getUserMediaMock.mockRejectedValue(new Error('boom'));

      await switchDevice('audio', deviceInfo('mic-new-device', 'audioinput'));

      expect(getUserMediaMock).toHaveBeenCalledTimes(1);
      expect(stopTrackSenderSpy).not.toHaveBeenCalled();
    });
  });

  describe('stale deviceId', () => {
    it('falls back through the constraint ladder', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      const fresh = createFakeTrack('mic-new', 'audio');
      getUserMediaMock
        .mockRejectedValueOnce(overconstrained())
        .mockResolvedValueOnce(createFakeStream([fresh]));

      await switchDevice('audio', deviceInfo('stale-id', 'audioinput'));

      expect(getUserMediaMock.mock.calls[0][0]).toEqual({
        audio: expect.objectContaining({ deviceId: { exact: 'stale-id' } })
      });
      expect(getUserMediaMock.mock.calls[1][0]).toEqual({
        audio: expect.objectContaining({ deviceId: 'stale-id' })
      });
      expect(senderTrack).toBe(fresh);
    });
  });

  describe('cleared selection', () => {
    it('releases the capture without acquiring anything', async () => {
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);

      await switchDevice('audio', null);

      expect(stopTrackSenderSpy).toHaveBeenCalled();
      expect(getUserMediaMock).not.toHaveBeenCalled();
    });
  });

  describe('with the local audio pipeline engaged', () => {
    it('swaps the pipeline input instead of the sender track', async () => {
      const pipeline = engagePipeline();
      const old = createFakeTrack('mic-old', 'audio');
      seed([old]);
      const fresh = createFakeTrack('mic-new', 'audio');
      getUserMediaMock.mockResolvedValue(createFakeStream([fresh]));

      await switchDevice('audio', deviceInfo('mic-new-device', 'audioinput'));

      expect(pipeline.setInputTrack).toHaveBeenCalledWith(fresh);
      expect(replaceSenderTrackSpy).not.toHaveBeenCalled();
      expect(localStream.getTracks()).toContain(fresh as unknown as MediaStreamTrack);
    });

    it('still routes video through the sender', async () => {
      engagePipeline();
      const old = createFakeTrack('cam-old', 'video');
      seed([old]);
      const fresh = createFakeTrack('cam-new', 'video');
      getUserMediaMock.mockResolvedValue(createFakeStream([fresh]));

      await switchDevice('video', deviceInfo('cam-new-device', 'videoinput'));

      expect(replaceSenderTrackSpy).toHaveBeenCalledWith('video', fresh);
    });
  });
});
