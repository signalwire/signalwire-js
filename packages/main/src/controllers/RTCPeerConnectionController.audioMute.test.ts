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
  getConstraints: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
  applyConstraints: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

function createFakeRawTrack(id: string): FakeRawTrack {
  const constraints: MediaTrackConstraints = {};
  const track: FakeRawTrack = {
    id,
    kind: 'audio',
    readyState: 'live',
    stop: vi.fn(() => {
      track.readyState = 'ended';
    }),
    getConstraints: vi.fn(() => constraints),
    getSettings: vi.fn(() => ({ deviceId: `${id}-device` })),
    applyConstraints: vi.fn(async () => undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  return track;
}

function createFakeStream(): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  return {
    addTrack: (track: MediaStreamTrack) => tracks.push(track),
    removeTrack: (track: MediaStreamTrack) => {
      const index = tracks.indexOf(track);
      if (index >= 0) {
        tracks.splice(index, 1);
      }
    },
    getTracks: () => [...tracks],
    getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video')
  } as unknown as MediaStream;
}

// ---------------------------------------------------------------------------
// Tests — engage the pipeline manually and exercise stop/restore on audio
// ---------------------------------------------------------------------------

describe('RTCPeerConnectionController audio mute path with LocalAudioPipeline', () => {
  let controller: RTCPeerConnectionController;
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let stopTrackSenderSpy: ReturnType<typeof vi.fn>;
  let restoreTrackSenderSpy: ReturnType<typeof vi.fn>;
  let updateSendersConstraintsSpy: ReturnType<typeof vi.fn>;

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
    updateSendersConstraintsSpy = vi.fn().mockResolvedValue(true);
    Object.defineProperty(controller, 'transceiverController', {
      value: {
        stopTrackSender: stopTrackSenderSpy,
        restoreTrackSender: restoreTrackSenderSpy,
        getConstraintsFor: vi.fn(() => ({ echoCancellation: true })),
        updateSendersConstraints: updateSendersConstraintsSpy,
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

  /** The spy installed by {@link seedRawAudioTrack}. */
  function removeTrackSpy(): ReturnType<typeof vi.fn> {
    return (
      (controller as unknown as { localStreamController: unknown })
        .localStreamController as { removeTrack: ReturnType<typeof vi.fn> }
    ).removeTrack;
  }

  describe('stopTrackSender("audio")', () => {
    it('releases the raw mic track and disconnects pipeline input', () => {
      const pipeline = engagePipeline();
      const raw = seedRawAudioTrack();

      controller.stopTrackSender('audio');

      expect(removeTrackSpy()).toHaveBeenCalledWith(raw.id);
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

    it('skips already-ended raw tracks', () => {
      const pipeline = engagePipeline();
      const raw = seedRawAudioTrack('raw-1');
      raw.readyState = 'ended';

      controller.stopTrackSender('audio');

      expect(removeTrackSpy()).not.toHaveBeenCalled();
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(null);
    });
  });

  /**
   * The suite above stubs `removeTrack`, so it cannot see which collaborator
   * actually ends the capture. These drive the real LocalStreamController.
   */
  describe('stopTrackSender("audio") against the real local stream', () => {
    function seedLiveLocalStream(id = 'raw-mic-1'): {
      raw: FakeRawTrack;
      localStream: () => MediaStream | null;
    } {
      const raw = createFakeRawTrack(id);
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as {
        setLocalStream: (stream: MediaStream) => void;
        addTrack: (track: MediaStreamTrack) => MediaStream;
        localStream: MediaStream | null;
      };
      lsc.setLocalStream(createFakeStream());
      lsc.addTrack(raw as unknown as MediaStreamTrack);
      return { raw, localStream: () => lsc.localStream };
    }

    it('ends the raw mic capture', () => {
      engagePipeline();
      const { raw } = seedLiveLocalStream();

      controller.stopTrackSender('audio');

      expect(raw.readyState).toBe('ended');
    });

    it('drops the raw mic capture from the local stream', () => {
      engagePipeline();
      const { raw, localStream } = seedLiveLocalStream();

      controller.stopTrackSender('audio');

      expect(localStream()?.getAudioTracks()).not.toContain(raw);
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

  /**
   * Once the pipeline is engaged the audio sender carries the processed
   * destination track, so a scan of the senders finds nothing it is allowed to
   * touch and every audio constraint API silently no-ops — server-pushed params
   * included. The constraints belong to the pipeline's device source, which is
   * the capture the sender ultimately carries.
   */
  describe("updateSendersConstraints('audio') with the pipeline engaged", () => {
    function seedTaggedRawTrack(id = 'raw-mic-1'): FakeRawTrack {
      const raw = seedRawAudioTrack(id);
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as {
        setTrackOrigin: (t: MediaStreamTrack, o: string) => void;
      };
      lsc.setTrackOrigin(raw as unknown as MediaStreamTrack, 'device');
      return raw;
    }

    it('applies the merged constraints to the pipeline input capture', async () => {
      engagePipeline();
      const raw = seedTaggedRawTrack();

      await controller.updateSendersConstraints('audio', { echoCancellation: false });

      expect(raw.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({ echoCancellation: false })
      );
    });

    it('reports the constraints as applied', async () => {
      engagePipeline();
      seedTaggedRawTrack();

      await expect(
        controller.updateSendersConstraints('audio', { echoCancellation: false })
      ).resolves.toBe(true);
    });

    it('does not route audio through the sender scan, which would skip it', async () => {
      engagePipeline();
      seedTaggedRawTrack();

      await controller.updateSendersConstraints('audio', { echoCancellation: false });

      expect(updateSendersConstraintsSpy).not.toHaveBeenCalled();
    });

    it('re-acquires and re-hooks the input when applyConstraints fails', async () => {
      const pipeline = engagePipeline();
      const raw = seedTaggedRawTrack();
      raw.applyConstraints = vi.fn().mockRejectedValue(new Error('not supported'));

      const fresh = createFakeRawTrack('raw-mic-fresh');
      getUserMediaMock.mockResolvedValueOnce({
        getAudioTracks: () => [fresh as unknown as MediaStreamTrack],
        getTracks: () => [fresh as unknown as MediaStreamTrack]
      } as unknown as MediaStream);
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as { addTrack: ReturnType<typeof vi.fn> };
      lsc.addTrack = vi.fn();

      await expect(
        controller.updateSendersConstraints('audio', { echoCancellation: false })
      ).resolves.toBe(true);

      expect(lsc.addTrack).toHaveBeenCalledWith(fresh);
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(fresh);
    });

    it('reports not applied and surfaces a MediaTrackError when re-acquisition fails', async () => {
      engagePipeline();
      const raw = seedTaggedRawTrack();
      raw.applyConstraints = vi.fn().mockRejectedValue(new Error('not supported'));
      getUserMediaMock.mockRejectedValueOnce(new Error('gUM failed'));

      const errors: Error[] = [];
      const sub = controller.errors$.subscribe((error) => errors.push(error));

      await expect(
        controller.updateSendersConstraints('audio', { echoCancellation: false })
      ).resolves.toBe(false);

      expect(errors.map((e) => e.name)).toContain('MediaTrackError');
      sub.unsubscribe();
    });

    it('leaves an application-supplied pipeline input untouched', async () => {
      engagePipeline();
      const raw = seedRawAudioTrack();
      const lsc = (controller as unknown as { localStreamController: unknown })
        .localStreamController as {
        setTrackOrigin: (t: MediaStreamTrack, o: string) => void;
      };
      lsc.setTrackOrigin(raw as unknown as MediaStreamTrack, 'application');

      await expect(
        controller.updateSendersConstraints('audio', { echoCancellation: false })
      ).resolves.toBe(false);
      expect(raw.applyConstraints).not.toHaveBeenCalled();
      expect(getUserMediaMock).not.toHaveBeenCalled();
    });

    it('still routes video through the transceiver controller', async () => {
      engagePipeline();
      seedTaggedRawTrack();

      await controller.updateSendersConstraints('video', { width: 1920 });

      expect(updateSendersConstraintsSpy).toHaveBeenCalledWith('video', { width: 1920 });
    });

    it('routes audio through the sender scan when no pipeline is engaged', async () => {
      seedTaggedRawTrack();

      await controller.updateSendersConstraints('audio', { echoCancellation: false });

      expect(updateSendersConstraintsSpy).toHaveBeenCalledWith('audio', {
        echoCancellation: false
      });
    });
  });

  /**
   * Omitted constraints mean "release the sender", which the sender scan
   * implements as `sender.track.stop()`. With the pipeline engaged that track
   * is the destination track, and ending it breaks the pipeline for the rest of
   * the call — the mute path routes around the scan for exactly this reason.
   */
  describe("updateSendersConstraints('audio') with no constraints and the pipeline engaged", () => {
    it('does not reach the sender scan, which would end the pipeline output track', async () => {
      engagePipeline();
      seedRawAudioTrack();

      await controller.updateSendersConstraints('audio', undefined);

      expect(updateSendersConstraintsSpy).not.toHaveBeenCalled();
    });

    it('releases the mic through the pipeline-aware stop path', async () => {
      const pipeline = engagePipeline();
      const raw = seedRawAudioTrack();

      await controller.updateSendersConstraints('audio', undefined);

      expect(removeTrackSpy()).toHaveBeenCalledWith(raw.id);
      expect(pipeline.setInputTrack).toHaveBeenCalledWith(null);
    });

    it('reports the constraints as not applied', async () => {
      engagePipeline();
      seedRawAudioTrack();

      await expect(controller.updateSendersConstraints('audio', undefined)).resolves.toBe(false);
    });

    it('still routes video through the sender scan', async () => {
      engagePipeline();
      seedRawAudioTrack();

      await controller.updateSendersConstraints('video', undefined);

      expect(updateSendersConstraintsSpy).toHaveBeenCalledWith('video', undefined);
    });

    it('still routes audio through the sender scan when no pipeline is engaged', async () => {
      seedRawAudioTrack();

      await controller.updateSendersConstraints('audio', undefined);

      expect(updateSendersConstraintsSpy).toHaveBeenCalledWith('audio', undefined);
    });
  });
});
