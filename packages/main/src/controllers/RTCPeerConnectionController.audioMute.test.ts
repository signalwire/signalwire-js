import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RTCPeerConnectionController } from './RTCPeerConnectionController';

import type { DeviceController } from '../interfaces/DeviceController';

// ---------------------------------------------------------------------------
// Mock LocalAudioPipeline — happy-dom has no AudioContext, and we want to
// observe pipeline calls precisely without exercising Web Audio plumbing.
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

// ---------------------------------------------------------------------------
// Minimal device controller / WebRTC API mocks
// ---------------------------------------------------------------------------

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
    deviceInfoToConstraints: vi.fn(() => ({})),
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

interface FakeRawTrack {
  id: string;
  kind: 'audio';
  readyState: 'live' | 'ended';
  stop: ReturnType<typeof vi.fn>;
}

function createFakeRawTrack(id: string): FakeRawTrack {
  const track: FakeRawTrack = {
    id,
    kind: 'audio',
    readyState: 'live',
    stop: vi.fn(() => {
      track.readyState = 'ended';
    })
  };
  return track;
}

// ---------------------------------------------------------------------------
// Tests — engage the pipeline manually and exercise stop/restore on audio
// ---------------------------------------------------------------------------

describe('RTCPeerConnectionController audio mute path with LocalAudioPipeline', () => {
  let controller: RTCPeerConnectionController;
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let stopTrackSenderSpy: ReturnType<typeof vi.fn>;
  let restoreTrackSenderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserMediaMock = vi.fn();

    Object.defineProperty(global, 'navigator', {
      value: { mediaDevices: { getUserMedia: getUserMediaMock } },
      writable: true,
      configurable: true
    });

    controller = new RTCPeerConnectionController(
      {
        inputAudioDeviceConstraints: { echoCancellation: true }
      },
      undefined,
      createMockDeviceController()
    );

    // Stub the underlying transceiver controller — the controller normally
    // lazily-creates this when initializing, but we just need its method
    // surface for these targeted mute path tests.
    stopTrackSenderSpy = vi.fn();
    restoreTrackSenderSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(controller, 'transceiverController', {
      value: {
        stopTrackSender: stopTrackSenderSpy,
        restoreTrackSender: restoreTrackSenderSpy,
        getConstraintsFor: vi.fn(() => ({ echoCancellation: true })),
        audioTransceivers: []
      },
      configurable: true
    });
  });

  function engagePipeline(): {
    setInputTrack: ReturnType<typeof vi.fn>;
  } {
    // Bypass the lazy-create path that would also try to attach to a
    // peerConnection. Inject a mock pipeline directly.
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

  function seedRawAudioTrack(id = 'raw-mic-1'): FakeRawTrack {
    const raw = createFakeRawTrack(id);
    // Reach into LocalStreamController's internal subject to seed a track
    // without going through addTrack (avoids requiring a MediaStream).
    const lsc = (controller as unknown as { localStreamController: unknown })
      .localStreamController as {
      _localAudioTracks$: BehaviorSubject<MediaStreamTrack[]>;
      removeTrack: ReturnType<typeof vi.fn> | ((id: string) => unknown);
    };
    (lsc._localAudioTracks$ as BehaviorSubject<MediaStreamTrack[]>).next([
      raw as unknown as MediaStreamTrack
    ]);
    // Spy on removeTrack so we can assert it's called on mute.
    lsc.removeTrack = vi.fn();
    return raw;
  }

  describe('stopTrackSender("audio")', () => {
    it('stops the raw mic track and disconnects pipeline input', () => {
      const pipeline = engagePipeline();
      const raw = seedRawAudioTrack();

      controller.stopTrackSender('audio');

      expect(raw.stop).toHaveBeenCalledTimes(1);
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(null);
    });

    it('does NOT call the underlying TransceiverController for audio when pipeline engaged', () => {
      engagePipeline();
      seedRawAudioTrack();

      controller.stopTrackSender('audio');

      expect(stopTrackSenderSpy).not.toHaveBeenCalled();
    });

    it('falls back to the default transceiver path when pipeline NOT engaged', () => {
      seedRawAudioTrack();

      controller.stopTrackSender('audio');

      expect(stopTrackSenderSpy).toHaveBeenCalledWith('audio', expect.any(Object));
    });

    it('on kind="both" with pipeline engaged, audio is pipeline-aware AND video routes to TransceiverController', () => {
      const pipeline = engagePipeline();
      seedRawAudioTrack();

      controller.stopTrackSender('both');

      expect(pipeline.setInputTrack).toHaveBeenCalledWith(null);
      expect(stopTrackSenderSpy).toHaveBeenCalledWith('video', expect.any(Object));
      expect(stopTrackSenderSpy).not.toHaveBeenCalledWith('audio', expect.any(Object));
    });

    it('skips track.stop() on already-ended raw tracks', () => {
      const pipeline = engagePipeline();
      const raw = createFakeRawTrack('raw-1');
      raw.readyState = 'ended';
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as { _localAudioTracks$: BehaviorSubject<MediaStreamTrack[]> };
      lsc._localAudioTracks$.next([raw as unknown as MediaStreamTrack]);

      controller.stopTrackSender('audio');

      expect(raw.stop).not.toHaveBeenCalled();
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(null);
    });
  });

  describe('restoreTrackSender("audio")', () => {
    it('re-acquires raw mic via getUserMedia and connects it to the pipeline input', async () => {
      const pipeline = engagePipeline();
      const newRaw = createFakeRawTrack('raw-mic-fresh');
      const fakeStream = {
        getAudioTracks: () => [newRaw as unknown as MediaStreamTrack]
      } as unknown as MediaStream;
      getUserMediaMock.mockResolvedValueOnce(fakeStream);

      // Spy on addTrack
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as { addTrack: ReturnType<typeof vi.fn> | ((t: unknown) => unknown) };
      const addTrackSpy = vi.fn();
      lsc.addTrack = addTrackSpy;

      await controller.restoreTrackSender('audio');

      expect(getUserMediaMock).toHaveBeenCalledWith({ audio: { echoCancellation: true } });
      expect(addTrackSpy).toHaveBeenCalledWith(newRaw);
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(newRaw);
    });

    it('does NOT call TransceiverController.restoreTrackSender for audio when pipeline engaged', async () => {
      engagePipeline();
      const newRaw = createFakeRawTrack('raw-mic-fresh');
      getUserMediaMock.mockResolvedValueOnce({
        getAudioTracks: () => [newRaw as unknown as MediaStreamTrack]
      } as unknown as MediaStream);
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as { addTrack: (t: unknown) => unknown };
      lsc.addTrack = vi.fn();

      await controller.restoreTrackSender('audio');

      expect(restoreTrackSenderSpy).not.toHaveBeenCalled();
    });

    it('falls back to the default transceiver path when pipeline NOT engaged', async () => {
      await controller.restoreTrackSender('audio');

      expect(restoreTrackSenderSpy).toHaveBeenCalledWith('audio');
      expect(getUserMediaMock).not.toHaveBeenCalled();
    });

    it('on kind="both" with pipeline engaged, audio is pipeline-aware AND video routes to TransceiverController', async () => {
      const pipeline = engagePipeline();
      const newRaw = createFakeRawTrack('raw-mic-fresh');
      getUserMediaMock.mockResolvedValueOnce({
        getAudioTracks: () => [newRaw as unknown as MediaStreamTrack]
      } as unknown as MediaStream);
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as { addTrack: (t: unknown) => unknown };
      lsc.addTrack = vi.fn();

      await controller.restoreTrackSender('both');

      expect(pipeline.setInputTrack).toHaveBeenCalledWith(newRaw);
      expect(restoreTrackSenderSpy).toHaveBeenCalledWith('video');
      expect(restoreTrackSenderSpy).not.toHaveBeenCalledWith('audio');
    });
  });
});
