import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalStreamController } from './LocalStreamController';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  id: string;
  kind: 'audio' | 'video';
  enabled = true;
  readyState: 'live' | 'ended' = 'live';
  private constraints: MediaTrackConstraints = {};
  private settings: MediaTrackSettings = {};

  constructor(kind: 'audio' | 'video', id?: string) {
    this.kind = kind;
    this.id = id || `${kind}-track-${Math.random().toString(36).substr(2, 9)}`;
    this.settings = { deviceId: `device-${this.id}` };
  }

  stop = vi.fn(() => {
    this.readyState = 'ended';
  });

  getConstraints = vi.fn(() => this.constraints);
  getSettings = vi.fn(() => this.settings);
  applyConstraints = vi.fn(async (constraints: MediaTrackConstraints) => {
    this.constraints = { ...this.constraints, ...constraints };
  });

  clone = vi.fn(() => {
    const cloned = new MockMediaStreamTrack(this.kind, `${this.id}-clone`);
    cloned.enabled = this.enabled;
    return cloned;
  });

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// Mock MediaStream
class MockMediaStream {
  id: string;
  active = true;
  private audioTracks: MockMediaStreamTrack[] = [];
  private videoTracks: MockMediaStreamTrack[] = [];

  constructor(tracks?: MockMediaStreamTrack[]) {
    this.id = `stream-${Math.random().toString(36).substr(2, 9)}`;
    if (tracks) {
      tracks.forEach((track) => {
        if (track.kind === 'audio') {
          this.audioTracks.push(track);
        } else {
          this.videoTracks.push(track);
        }
      });
    }
  }

  getAudioTracks = vi.fn(() => [...this.audioTracks]);
  getVideoTracks = vi.fn(() => [...this.videoTracks]);
  getTracks = vi.fn(() => [...this.audioTracks, ...this.videoTracks]);

  addTrack = vi.fn((track: MockMediaStreamTrack) => {
    if (track.kind === 'audio') {
      this.audioTracks.push(track);
    } else {
      this.videoTracks.push(track);
    }
  });

  removeTrack = vi.fn((track: MockMediaStreamTrack) => {
    if (track.kind === 'audio') {
      this.audioTracks = this.audioTracks.filter((t) => t.id !== track.id);
    } else {
      this.videoTracks = this.videoTracks.filter((t) => t.id !== track.id);
    }
  });
}

// Setup global MediaStream mock
global.MediaStream = MockMediaStream as unknown as typeof MediaStream;

describe('[LocalStreamController]', () => {
  let controller: LocalStreamController;
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockGetDisplayMedia: ReturnType<typeof vi.fn>;

  const createController = (
    options: Partial<{
      propose: 'main' | 'additional-device' | 'screenshare';
      inputAudioStream: MediaStream;
      inputVideoStream: MediaStream;
      inputAudioDeviceConstraints: MediaTrackConstraints;
      inputVideoDeviceConstraints: MediaTrackConstraints;
    }> = {}
  ) => {
    mockGetUserMedia = vi
      .fn()
      .mockResolvedValue(
        new MockMediaStream([new MockMediaStreamTrack('audio'), new MockMediaStreamTrack('video')])
      );
    mockGetDisplayMedia = vi
      .fn()
      .mockResolvedValue(new MockMediaStream([new MockMediaStreamTrack('video')]));

    return new LocalStreamController({
      propose: options.propose ?? 'main',
      inputAudioStream: options.inputAudioStream,
      inputVideoStream: options.inputVideoStream,
      inputAudioDeviceConstraints: options.inputAudioDeviceConstraints ?? {
        echoCancellation: true
      },
      inputVideoDeviceConstraints: options.inputVideoDeviceConstraints ?? {
        width: 1280,
        height: 720
      },
      getUserMedia: mockGetUserMedia as (
        constraints: MediaStreamConstraints
      ) => Promise<MediaStream>,
      getDisplayMedia: mockGetDisplayMedia as (
        options: DisplayMediaStreamOptions
      ) => Promise<MediaStream>
    });
  };

  beforeEach(() => {
    controller = createController();
  });

  afterEach(() => {
    controller.destroy();
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create controller with default options', () => {
      expect(controller).toBeDefined();
    });

    it('should have null localStream initially', () => {
      expect(controller.localStream).toBeNull();
    });

    it('should have empty audio tracks initially', () => {
      expect(controller.localAudioTracks).toEqual([]);
    });

    it('should have empty video tracks initially', () => {
      expect(controller.localVideoTracks).toEqual([]);
    });
  });

  describe('buildLocalStream', () => {
    it('should call getUserMedia with correct constraints for main propose', async () => {
      await controller.buildLocalStream();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: { echoCancellation: true },
        video: { width: 1280, height: 720 }
      });
    });

    it('should call getDisplayMedia for screenshare propose', async () => {
      const screenshareController = createController({ propose: 'screenshare' });
      await screenshareController.buildLocalStream();

      expect(mockGetDisplayMedia).toHaveBeenCalledWith({
        video: true,
        audio: true // echoCancellation: true is truthy
      });
      screenshareController.destroy();
    });

    it('should use inputAudioStream and inputVideoStream if provided', async () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      const videoTrack = new MockMediaStreamTrack('video');
      const inputAudioStream = new MockMediaStream([audioTrack]);
      const inputVideoStream = new MockMediaStream([videoTrack]);

      const streamController = createController({
        inputAudioStream: inputAudioStream as unknown as MediaStream,
        inputVideoStream: inputVideoStream as unknown as MediaStream
      });

      await streamController.buildLocalStream();

      expect(mockGetUserMedia).not.toHaveBeenCalled();
      expect(mockGetDisplayMedia).not.toHaveBeenCalled();
      expect(streamController.localStream).toBeDefined();
      streamController.destroy();
    });

    it('should update localStream$ observable after building', async () => {
      const streams: (MediaStream | null)[] = [];
      controller.localStream$.subscribe((stream) => streams.push(stream));

      await controller.buildLocalStream();

      expect(streams.length).toBeGreaterThan(0);
      expect(streams[streams.length - 1]).not.toBeNull();
    });

    it('populates localAudioTracks / localVideoTracks from the freshly-built stream', async () => {
      // Synchronous getters and the BehaviorSubjects must reflect the stream
      // immediately after buildLocalStream completes — otherwise code paths
      // that read these (e.g. LocalAudioPipeline track hookup at call setup)
      // see [] and fail to wire up. See PR for the mute-after-call-start bug.
      await controller.buildLocalStream();

      expect(controller.localAudioTracks).toHaveLength(1);
      expect(controller.localAudioTracks[0].kind).toBe('audio');
      expect(controller.localVideoTracks).toHaveLength(1);
      expect(controller.localVideoTracks[0].kind).toBe('video');
    });

    it('emits localAudioTracks$ / localVideoTracks$ after buildLocalStream', async () => {
      const audio: MediaStreamTrack[][] = [];
      const video: MediaStreamTrack[][] = [];
      controller.localAudioTracks$.subscribe((t) => audio.push(t));
      controller.localVideoTracks$.subscribe((t) => video.push(t));

      await controller.buildLocalStream();

      // Initial [] (BehaviorSubject seed) + one emission per kind from buildLocalStream.
      expect(audio.length).toBeGreaterThanOrEqual(2);
      expect(audio[audio.length - 1]).toHaveLength(1);
      expect(video.length).toBeGreaterThanOrEqual(2);
      expect(video[video.length - 1]).toHaveLength(1);
    });
  });

  describe('addTrack', () => {
    it('should add an audio track to the local stream', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      const stream = controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      expect(stream).toBeDefined();
      expect(controller.localStream).toBe(stream);
    });

    it('should add a video track to the local stream', () => {
      const videoTrack = new MockMediaStreamTrack('video');
      const stream = controller.addTrack(videoTrack as unknown as MediaStreamTrack);

      expect(stream).toBeDefined();
      expect(controller.localStream).toBe(stream);
    });

    it('should add track ended event listener', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      expect(audioTrack.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
    });

    it('should update localAudioTracks$ when adding audio track', () => {
      const tracks: MediaStreamTrack[][] = [];
      controller.localAudioTracks$.subscribe((t) => tracks.push(t));

      const audioTrack = new MockMediaStreamTrack('audio');
      controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      expect(tracks[tracks.length - 1].length).toBe(1);
    });

    it('should update localVideoTracks$ when adding video track', () => {
      const tracks: MediaStreamTrack[][] = [];
      controller.localVideoTracks$.subscribe((t) => tracks.push(t));

      const videoTrack = new MockMediaStreamTrack('video');
      controller.addTrack(videoTrack as unknown as MediaStreamTrack);

      expect(tracks[tracks.length - 1].length).toBe(1);
    });

    it('should create a new MediaStream if none exists', () => {
      expect(controller.localStream).toBeNull();

      const audioTrack = new MockMediaStreamTrack('audio');
      const stream = controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      expect(stream).toBeDefined();
      expect(controller.localStream).toBe(stream);
    });
  });

  describe('removeTrack', () => {
    it('should remove an audio track from the local stream', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      const removed = controller.removeTrack(audioTrack.id);

      expect(removed).toBeDefined();
      expect(audioTrack.stop).toHaveBeenCalled();
      expect(audioTrack.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
    });

    it('should remove a video track from the local stream', () => {
      const videoTrack = new MockMediaStreamTrack('video');
      controller.addTrack(videoTrack as unknown as MediaStreamTrack);

      const removed = controller.removeTrack(videoTrack.id);

      expect(removed).toBeDefined();
      expect(videoTrack.stop).toHaveBeenCalled();
    });

    it('should return undefined for non-existent track', () => {
      const removed = controller.removeTrack('non-existent-id');
      expect(removed).toBeUndefined();
    });

    it('should update localAudioTracks$ when removing audio track', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      const tracks: MediaStreamTrack[][] = [];
      controller.localAudioTracks$.subscribe((t) => tracks.push(t));

      controller.removeTrack(audioTrack.id);

      expect(tracks[tracks.length - 1].length).toBe(0);
    });

    it('should update localVideoTracks$ when removing video track', () => {
      const videoTrack = new MockMediaStreamTrack('video');
      controller.addTrack(videoTrack as unknown as MediaStreamTrack);

      const tracks: MediaStreamTrack[][] = [];
      controller.localVideoTracks$.subscribe((t) => tracks.push(t));

      controller.removeTrack(videoTrack.id);

      expect(tracks[tracks.length - 1].length).toBe(0);
    });
  });

  describe('getOrCreateLocalStream', () => {
    it('should return existing stream if available', async () => {
      await controller.buildLocalStream();
      const existingStream = controller.localStream;

      const stream = controller.getOrCreateLocalStream();

      expect(stream).toBe(existingStream);
    });

    it('should create a new stream if none exists', () => {
      expect(controller.localStream).toBeNull();

      const stream = controller.getOrCreateLocalStream();

      expect(stream).toBeDefined();
    });
  });

  describe('setLocalStream', () => {
    it('should set the local stream directly', () => {
      const stream = new MockMediaStream();
      controller.setLocalStream(stream as unknown as MediaStream);

      expect(controller.localStream).toBe(stream);
    });

    it('should allow setting to null', () => {
      const stream = new MockMediaStream();
      controller.setLocalStream(stream as unknown as MediaStream);
      controller.setLocalStream(null);

      expect(controller.localStream).toBeNull();
    });
  });

  describe('addTrackEndedListener', () => {
    it('should add ended event listener to track', () => {
      const track = new MockMediaStreamTrack('audio');
      controller.addTrackEndedListener(track as unknown as MediaStreamTrack);

      expect(track.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
    });
  });

  describe('mediaTrackEnded$', () => {
    it('should emit when a track ends', async () => {
      const endedTracks: MediaStreamTrack[] = [];
      controller.mediaTrackEnded$.subscribe((track) => endedTracks.push(track));

      const audioTrack = new MockMediaStreamTrack('audio');
      controller.addTrack(audioTrack as unknown as MediaStreamTrack);

      // Simulate track ended event
      const endedHandler = audioTrack.addEventListener.mock.calls.find(
        (call) => call[0] === 'ended'
      )?.[1];
      if (endedHandler) {
        endedHandler(audioTrack);
      }

      expect(endedTracks.length).toBe(1);
    });
  });

  describe('stopAllTracks', () => {
    it('should stop all tracks in the local stream', async () => {
      await controller.buildLocalStream();
      const tracks = controller.localStream?.getTracks() ?? [];

      controller.stopAllTracks();

      tracks.forEach((track) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should remove event listeners from all tracks', async () => {
      await controller.buildLocalStream();
      const tracks = controller.localStream?.getTracks() ?? [];

      controller.stopAllTracks();

      tracks.forEach((track) => {
        expect(track.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      });
    });
  });

  describe('destroy', () => {
    it('should stop all tracks when destroyed', async () => {
      await controller.buildLocalStream();
      const tracks = controller.localStream?.getTracks() ?? [];

      controller.destroy();

      tracks.forEach((track) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should complete observables when destroyed', () => {
      let completed = false;
      controller.localStream$.subscribe({
        complete: () => {
          completed = true;
        }
      });

      controller.destroy();

      expect(completed).toBe(true);
    });
  });
});
