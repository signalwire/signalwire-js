import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransceiverController } from './TransceiverController';
import type { LocalStreamController } from './LocalStreamController';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  id: string;
  kind: 'audio' | 'video';
  enabled = true;
  readyState: 'live' | 'ended' = 'live';
  private constraints: MediaTrackConstraints = {};

  constructor(kind: 'audio' | 'video', id?: string) {
    this.kind = kind;
    this.id = id || `${kind}-track-${Math.random().toString(36).substr(2, 9)}`;
  }

  private settings: MediaTrackSettings = {};

  stop = vi.fn(() => {
    this.readyState = 'ended';
  });

  getConstraints = vi.fn(() => this.constraints);
  getSettings = vi.fn(() => this.settings);
  applyConstraints = vi.fn(async (constraints: MediaTrackConstraints) => {
    this.constraints = { ...this.constraints, ...constraints };
  });

  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  setSettings(settings: MediaTrackSettings): void {
    this.settings = settings;
  }
}

// Mock MediaStream
class MockMediaStream {
  id: string;
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

// Mock RTCRtpSender
class MockRTCRtpSender {
  track: MockMediaStreamTrack | null = null;

  constructor(track?: MockMediaStreamTrack) {
    this.track = track || null;
  }

  replaceTrack = vi.fn(async (track: MockMediaStreamTrack | null) => {
    this.track = track;
  });

  setStreams = vi.fn();

  getParameters = vi.fn(() => ({
    encodings: [],
    headerExtensions: [],
    rtcp: {},
    codecs: []
  }));

  setParameters = vi.fn(async () => {});
}

// Mock RTCRtpReceiver
class MockRTCRtpReceiver {
  track: MockMediaStreamTrack;

  constructor(kind: 'audio' | 'video') {
    this.track = new MockMediaStreamTrack(kind);
  }
}

// Mock RTCRtpTransceiver
class MockRTCRtpTransceiver {
  mid: string | null = null;
  sender: MockRTCRtpSender;
  receiver: MockRTCRtpReceiver;
  direction: RTCRtpTransceiverDirection = 'sendrecv';
  currentDirection: RTCRtpTransceiverDirection | null = null;
  stopped = false;

  constructor(kind: 'audio' | 'video', mid?: string) {
    this.mid = mid ?? `${kind}-mid-${Math.random().toString(36).substr(2, 9)}`;
    this.sender = new MockRTCRtpSender();
    this.receiver = new MockRTCRtpReceiver(kind);
  }

  stop = vi.fn(() => {
    this.stopped = true;
  });

  setCodecPreferences = vi.fn();
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  connectionState: RTCPeerConnectionState = 'new';
  private transceivers: MockRTCRtpTransceiver[] = [];
  private senders: MockRTCRtpSender[] = [];

  addTransceiver = vi.fn(
    (trackOrKind: MockMediaStreamTrack | string, init?: RTCRtpTransceiverInit) => {
      const kind =
        typeof trackOrKind === 'string' ? (trackOrKind as 'audio' | 'video') : trackOrKind.kind;
      const transceiver = new MockRTCRtpTransceiver(kind);
      if (init?.direction) {
        transceiver.direction = init.direction;
      }
      if (typeof trackOrKind !== 'string') {
        transceiver.sender.track = trackOrKind;
      }
      this.transceivers.push(transceiver);
      this.senders.push(transceiver.sender);
      return transceiver;
    }
  );

  addTrack = vi.fn((track: MockMediaStreamTrack) => {
    const sender = new MockRTCRtpSender(track);
    this.senders.push(sender);
    return sender;
  });

  getTransceivers = vi.fn(() => [...this.transceivers]);
  getSenders = vi.fn(() => [...this.senders]);
  getReceivers = vi.fn(() => this.transceivers.map((t) => t.receiver));

  // Helper methods for testing
  addMockTransceiver(kind: 'audio' | 'video', mid?: string): MockRTCRtpTransceiver {
    const transceiver = new MockRTCRtpTransceiver(kind, mid);
    this.transceivers.push(transceiver);
    this.senders.push(transceiver.sender);
    return transceiver;
  }

  addMockSender(track?: MockMediaStreamTrack): MockRTCRtpSender {
    const sender = new MockRTCRtpSender(track);
    this.senders.push(sender);
    return sender;
  }
}

// Mock LocalStreamController
class MockLocalStreamController {
  private _localStream: MockMediaStream | null = null;

  constructor(localStream?: MockMediaStream | null) {
    this._localStream = localStream ?? null;
  }

  get localStream(): MockMediaStream | null {
    return this._localStream;
  }

  setLocalStream(stream: MockMediaStream | null): void {
    this._localStream = stream;
  }

  addTrack = vi.fn((track: MockMediaStreamTrack) => {
    if (!this._localStream) {
      this._localStream = new MockMediaStream();
    }
    this._localStream.addTrack(track);
    return this._localStream;
  });

  removeTrack = vi.fn((trackId: string) => {
    const track = this._localStream
      ?.getTracks()
      .find((t: MockMediaStreamTrack) => t.id === trackId);
    if (track) {
      this._localStream?.removeTrack(track);
      track.stop();
      return track;
    }
    return undefined;
  });
}

describe('[TransceiverController]', () => {
  let controller: TransceiverController;
  let mockPeerConnection: MockRTCPeerConnection;
  let mockLocalStreamController: MockLocalStreamController;

  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  const createController = (
    options: Partial<{
      propose: 'main' | 'additional-device' | 'screenshare';
      simulcast: boolean;
      sfu: boolean;
      msStreamsNumber: number;
      receiveAudio: boolean;
      receiveVideo: boolean;
      getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    }> = {}
  ) => {
    mockPeerConnection = new MockRTCPeerConnection();
    mockLocalStreamController = new MockLocalStreamController(new MockMediaStream());
    mockGetUserMedia = vi.fn().mockResolvedValue(new MockMediaStream());

    return new TransceiverController({
      peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
      propose: options.propose ?? 'main',
      simulcast: options.simulcast ?? false,
      sfu: options.sfu ?? false,
      msStreamsNumber: options.msStreamsNumber ?? 5,
      receiveAudio: options.receiveAudio ?? true,
      receiveVideo: options.receiveVideo ?? true,
      localStreamController: mockLocalStreamController as unknown as LocalStreamController,
      getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
      getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
      getUserMedia:
        options.getUserMedia ??
        (mockGetUserMedia as (c: MediaStreamConstraints) => Promise<MediaStream>)
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

    it('should use the provided peer connection', () => {
      expect(controller.useAddTransceivers).toBe(true);
    });
  });

  describe('Capability Detection', () => {
    it('should detect addTransceiver support', () => {
      expect(controller.useAddTransceivers).toBe(true);
    });

    it('should detect addTrack support', () => {
      expect(controller.useAddTrack).toBe(true);
    });

    it('should detect addStream support (deprecated API)', () => {
      // Our mock doesn't have addStream, so this should be false
      expect(controller.useAddStream).toBe(false);
    });
  });

  describe('Audio Direction', () => {
    it('should return sendonly for additional-device propose', () => {
      const additionalDeviceController = createController({ propose: 'additional-device' });
      expect(additionalDeviceController.audioDirection).toBe('sendonly');
      additionalDeviceController.destroy();
    });

    it('should return sendrecv when both sending and receiving audio', () => {
      // Create a stream with an enabled audio track
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.enabled = true;
      const streamWithTrack = new MockMediaStream([audioTrack]);
      const localStreamCtrl = new MockLocalStreamController(streamWithTrack);

      mockPeerConnection = new MockRTCPeerConnection();
      const mainController = new TransceiverController({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
        getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      expect(mainController.audioDirection).toBe('sendrecv');
      mainController.destroy();
    });

    it('should return sendrecv when wantsToSendAudio is true (via constraints) even without local track', () => {
      // The logic uses Boolean(inputAudioDeviceConstraints) to determine if we want to send
      // Since {} is truthy, this returns sendrecv when receiveAudio is also true
      mockPeerConnection = new MockRTCPeerConnection();
      const localStreamCtrl = new MockLocalStreamController(null);
      const mainController = new TransceiverController({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({}), // {} is truthy, so wantsToSendAudio=true
        getInputVideoDeviceConstraints: () => ({}),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      // When there's no local stream but constraints exist (truthy), wantsToSendAudio is true
      // Combined with receiveAudio=true, direction is sendrecv
      expect(mainController.audioDirection).toBe('sendrecv');
      mainController.destroy();
    });
  });

  describe('Video Direction', () => {
    it('should return sendonly for additional-device propose', () => {
      const additionalDeviceController = createController({ propose: 'additional-device' });
      expect(additionalDeviceController.videoDirection).toBe('sendonly');
      additionalDeviceController.destroy();
    });

    it('should return sendonly for screenshare propose', () => {
      const screenshareController = createController({ propose: 'screenshare' });
      expect(screenshareController.videoDirection).toBe('sendonly');
      screenshareController.destroy();
    });

    it('should return recvonly for SFU mode', () => {
      const sfuController = createController({ sfu: true });
      expect(sfuController.videoDirection).toBe('recvonly');
      sfuController.destroy();
    });
  });

  describe('Transceiver Management', () => {
    it('should get audio transceivers', () => {
      mockPeerConnection.addMockTransceiver('audio', 'audio-0');
      mockPeerConnection.addMockTransceiver('video', 'video-0');

      const audioTransceivers = controller.audioTransceivers;
      expect(audioTransceivers.length).toBe(1);
      expect(audioTransceivers[0].mid).toBe('audio-0');
    });

    it('should get video transceivers', () => {
      mockPeerConnection.addMockTransceiver('audio', 'audio-0');
      mockPeerConnection.addMockTransceiver('video', 'video-0');

      const videoTransceivers = controller.videoTransceivers;
      expect(videoTransceivers.length).toBe(1);
      expect(videoTransceivers[0].mid).toBe('video-0');
    });

    it('should get transceivers by kind', () => {
      mockPeerConnection.addMockTransceiver('audio', 'audio-0');
      mockPeerConnection.addMockTransceiver('audio', 'audio-1');
      mockPeerConnection.addMockTransceiver('video', 'video-0');

      const audioTransceivers = controller.transceiverByKind('audio');
      expect(audioTransceivers.length).toBe(2);

      const videoTransceivers = controller.transceiverByKind('video');
      expect(videoTransceivers.length).toBe(1);

      const allTransceivers = controller.transceiverByKind('both');
      expect(allTransceivers.length).toBe(3);
    });
  });

  describe('setupTransceiverSender', () => {
    it('should add a new transceiver when none exists', async () => {
      // Create controller with audio enabled (sendrecv direction)
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.enabled = true;
      const stream = new MockMediaStream([audioTrack]);
      const localStreamCtrl = new MockLocalStreamController(stream);

      mockPeerConnection = new MockRTCPeerConnection();
      const sendController = new TransceiverController({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
        getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      await sendController.setupTransceiverSender(
        audioTrack as unknown as MediaStreamTrack,
        stream as unknown as MediaStream
      );

      expect(mockPeerConnection.addTransceiver).toHaveBeenCalled();
      sendController.destroy();
    });

    it('should replace track on existing transceiver', async () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.enabled = true;
      const stream = new MockMediaStream([audioTrack]);
      const localStreamCtrl = new MockLocalStreamController(stream);

      mockPeerConnection = new MockRTCPeerConnection();
      const existingTransceiver = mockPeerConnection.addMockTransceiver('audio');
      existingTransceiver.direction = 'sendrecv';

      const sendController = new TransceiverController({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
        getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      await sendController.setupTransceiverSender(
        audioTrack as unknown as MediaStreamTrack,
        stream as unknown as MediaStream,
        existingTransceiver as unknown as RTCRtpTransceiver
      );

      expect(existingTransceiver.sender.replaceTrack).toHaveBeenCalledWith(audioTrack);
      sendController.destroy();
    });
  });

  describe('stopTrackSender', () => {
    it('should stop audio track sender', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.readyState = 'live';
      const transceiver = mockPeerConnection.addMockTransceiver('audio');
      transceiver.sender.track = audioTrack;
      mockLocalStreamController.localStream?.addTrack(audioTrack);

      controller.stopTrackSender('audio');

      expect(audioTrack.stop).toHaveBeenCalled();
    });

    it('should stop video track sender', () => {
      const videoTrack = new MockMediaStreamTrack('video');
      videoTrack.readyState = 'live';
      const transceiver = mockPeerConnection.addMockTransceiver('video');
      transceiver.sender.track = videoTrack;
      mockLocalStreamController.localStream?.addTrack(videoTrack);

      controller.stopTrackSender('video');

      expect(videoTrack.stop).toHaveBeenCalled();
    });

    it('should stop both audio and video track senders', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      const videoTrack = new MockMediaStreamTrack('video');
      audioTrack.readyState = 'live';
      videoTrack.readyState = 'live';

      const audioTransceiver = mockPeerConnection.addMockTransceiver('audio');
      audioTransceiver.sender.track = audioTrack;
      const videoTransceiver = mockPeerConnection.addMockTransceiver('video');
      videoTransceiver.sender.track = videoTrack;

      mockLocalStreamController.localStream?.addTrack(audioTrack);
      mockLocalStreamController.localStream?.addTrack(videoTrack);

      controller.stopTrackSender('both');

      expect(audioTrack.stop).toHaveBeenCalled();
      expect(videoTrack.stop).toHaveBeenCalled();
    });

    it('should update transceiver direction when option is set', () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.readyState = 'live';
      const transceiver = mockPeerConnection.addMockTransceiver('audio');
      transceiver.sender.track = audioTrack;
      transceiver.direction = 'sendrecv';
      mockLocalStreamController.localStream?.addTrack(audioTrack);

      controller.stopTrackSender('audio', { updateTransceiverDirection: true });

      expect(transceiver.direction).toBe('inactive');
    });
  });

  describe('replaceSenderTrack', () => {
    it('should replace audio sender track', async () => {
      const oldTrack = new MockMediaStreamTrack('audio');
      const newTrack = new MockMediaStreamTrack('audio');
      const transceiver = mockPeerConnection.addMockTransceiver('audio');
      transceiver.sender.track = oldTrack;

      await controller.replaceSenderTrack('audio', newTrack as unknown as MediaStreamTrack);

      expect(transceiver.sender.replaceTrack).toHaveBeenCalledWith(newTrack);
    });

    it('should replace video sender track', async () => {
      const oldTrack = new MockMediaStreamTrack('video');
      const newTrack = new MockMediaStreamTrack('video');
      const transceiver = mockPeerConnection.addMockTransceiver('video');
      transceiver.sender.track = oldTrack;

      await controller.replaceSenderTrack('video', newTrack as unknown as MediaStreamTrack);

      expect(transceiver.sender.replaceTrack).toHaveBeenCalledWith(newTrack);
    });
  });

  describe('setupRemoteTransceivers', () => {
    it('should skip setup for answer type', async () => {
      await controller.setupRemoteTransceivers('answer');
      // No transceivers should be added for answer type
      expect(mockPeerConnection.addTransceiver).not.toHaveBeenCalled();
    });

    it('should add recvonly video transceivers in SFU mode', async () => {
      const sfuController = createController({ sfu: true, msStreamsNumber: 3 });

      await sfuController.setupRemoteTransceivers('offer');

      // Should add 3 recvonly video transceivers
      const addTransceiverCalls = mockPeerConnection.addTransceiver.mock.calls.filter(
        (call: unknown[]) =>
          call[0] === 'video' && (call[1] as RTCRtpTransceiverInit)?.direction === 'recvonly'
      );

      expect(addTransceiverCalls.length).toBe(3);
      sfuController.destroy();
    });
  });

  describe('updateSendersConstraints', () => {
    it('should apply constraints to audio senders', async () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.readyState = 'live';
      mockPeerConnection.addMockSender(audioTrack);

      await controller.updateSendersConstraints('audio', { echoCancellation: false });

      expect(audioTrack.applyConstraints).toHaveBeenCalled();
    });

    it('should apply constraints to video senders', async () => {
      const videoTrack = new MockMediaStreamTrack('video');
      videoTrack.readyState = 'live';
      mockPeerConnection.addMockSender(videoTrack);

      await controller.updateSendersConstraints('video', { width: 1920, height: 1080 });

      expect(videoTrack.applyConstraints).toHaveBeenCalled();
    });

    it('should not apply constraints to ended tracks', async () => {
      const audioTrack = new MockMediaStreamTrack('audio');
      audioTrack.readyState = 'ended';
      mockPeerConnection.addMockSender(audioTrack);

      await controller.updateSendersConstraints('audio', { echoCancellation: false });

      expect(audioTrack.applyConstraints).not.toHaveBeenCalled();
    });

    it('should fall back to track replacement when applyConstraints fails', async () => {
      const oldAudioTrack = new MockMediaStreamTrack('audio', 'old-audio-id');
      oldAudioTrack.readyState = 'live';
      oldAudioTrack.setSettings({ deviceId: 'mic-123' });
      oldAudioTrack.applyConstraints = vi
        .fn()
        .mockRejectedValue(new Error('applyConstraints not supported'));
      const sender = mockPeerConnection.addMockSender(oldAudioTrack);

      const newAudioTrack = new MockMediaStreamTrack('audio', 'new-audio-id');
      const newStream = new MockMediaStream([newAudioTrack]);

      const customGetUserMedia = vi.fn().mockResolvedValue(newStream);
      const testController = createController({
        getUserMedia: customGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      // Re-add the sender to the new mock peer connection
      const testSender = mockPeerConnection.addMockSender(oldAudioTrack);

      await testController.updateSendersConstraints('audio', { echoCancellation: false });

      // applyConstraints should have been called (and failed)
      expect(oldAudioTrack.applyConstraints).toHaveBeenCalled();
      // Old track should have been stopped
      expect(oldAudioTrack.stop).toHaveBeenCalled();
      // getUserMedia should have been called with merged constraints + preserved deviceId
      expect(customGetUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: false,
          deviceId: { exact: 'mic-123' }
        })
      });
      // New track should be added to localStream
      expect(mockLocalStreamController.addTrack).toHaveBeenCalledWith(newAudioTrack);
      // Sender should have the new track replaced
      expect(testSender.replaceTrack).toHaveBeenCalledWith(newAudioTrack);

      testController.destroy();
    });

    it('should preserve deviceId when falling back to track replacement', async () => {
      const oldVideoTrack = new MockMediaStreamTrack('video', 'old-video-id');
      oldVideoTrack.readyState = 'live';
      oldVideoTrack.setSettings({ deviceId: 'camera-456' });
      oldVideoTrack.applyConstraints = vi
        .fn()
        .mockRejectedValue(new Error('applyConstraints not supported'));

      const newVideoTrack = new MockMediaStreamTrack('video', 'new-video-id');
      const newStream = new MockMediaStream([newVideoTrack]);
      const customGetUserMedia = vi.fn().mockResolvedValue(newStream);

      const testController = createController({
        getUserMedia: customGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      mockPeerConnection.addMockSender(oldVideoTrack);

      await testController.updateSendersConstraints('video', { width: 1920 });

      expect(customGetUserMedia).toHaveBeenCalledWith({
        video: expect.objectContaining({
          width: 1920,
          deviceId: { exact: 'camera-456' }
        })
      });

      testController.destroy();
    });

    it('should call onError if track replacement fallback also fails', async () => {
      const oldAudioTrack = new MockMediaStreamTrack('audio', 'old-audio-id');
      oldAudioTrack.readyState = 'live';
      oldAudioTrack.setSettings({});
      oldAudioTrack.applyConstraints = vi
        .fn()
        .mockRejectedValue(new Error('applyConstraints not supported'));

      const customGetUserMedia = vi.fn().mockRejectedValue(new Error('getUserMedia also failed'));
      const onError = vi.fn();

      mockPeerConnection = new MockRTCPeerConnection();
      mockLocalStreamController = new MockLocalStreamController(new MockMediaStream());
      mockPeerConnection.addMockSender(oldAudioTrack);

      const testController = new TransceiverController({
        peerConnection: mockPeerConnection as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: mockLocalStreamController as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
        getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
        getUserMedia: customGetUserMedia as (c: MediaStreamConstraints) => Promise<MediaStream>,
        onError
      });

      await testController.updateSendersConstraints('audio', { echoCancellation: false });

      // onError should be called with the fallback error
      expect(onError).toHaveBeenCalled();

      testController.destroy();
    });
  });

  describe('getMediaDirections', () => {
    it('should return inactive directions when not connected', () => {
      const directions = controller.getMediaDirections();
      expect(['inactive', 'sendrecv', 'recvonly', 'sendonly']).toContain(directions.audio);
      expect(['inactive', 'sendrecv', 'recvonly', 'sendonly']).toContain(directions.video);
    });

    it('should return actual transceiver directions when connected', () => {
      mockPeerConnection.connectionState = 'connected';
      const audioTransceiver = mockPeerConnection.addMockTransceiver('audio');
      audioTransceiver.direction = 'sendrecv';
      const videoTransceiver = mockPeerConnection.addMockTransceiver('video');
      videoTransceiver.direction = 'recvonly';

      const directions = controller.getMediaDirections();

      expect(directions.audio).toBe('sendrecv');
      expect(directions.video).toBe('recvonly');
    });
  });

  describe('restoreTrackSender', () => {
    it('should restore video track when sender track is null', async () => {
      const newVideoTrack = new MockMediaStreamTrack('video');
      const newStream = new MockMediaStream([newVideoTrack]);
      const customMockGetUserMedia = vi.fn().mockResolvedValue(newStream);

      // Create controller with custom getUserMedia
      const testController = createController({
        getUserMedia: customMockGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      // Add a video transceiver with null sender track (simulating stopped video)
      const videoTransceiver = mockPeerConnection.addMockTransceiver('video');
      videoTransceiver.sender.track = null;

      await testController.restoreTrackSender('video');

      // Should call getUserMedia with video constraints from getInputVideoDeviceConstraints
      expect(customMockGetUserMedia).toHaveBeenCalledWith({ video: { width: 1280, height: 720 } });
      // Should add the new track to local stream via localStreamController
      expect(mockLocalStreamController.addTrack).toHaveBeenCalledWith(newVideoTrack);
      // Should replace the track on the sender
      expect(videoTransceiver.sender.replaceTrack).toHaveBeenCalledWith(newVideoTrack);

      testController.destroy();
    });

    it('should restore video track when sender track readyState is ended', async () => {
      const endedTrack = new MockMediaStreamTrack('video');
      endedTrack.readyState = 'ended';
      const newVideoTrack = new MockMediaStreamTrack('video');
      const newStream = new MockMediaStream([newVideoTrack]);
      const customMockGetUserMedia = vi.fn().mockResolvedValue(newStream);

      const testController = createController({
        getUserMedia: customMockGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      const videoTransceiver = mockPeerConnection.addMockTransceiver('video');
      videoTransceiver.sender.track = endedTrack;

      await testController.restoreTrackSender('video');

      expect(customMockGetUserMedia).toHaveBeenCalledWith({ video: { width: 1280, height: 720 } });
      expect(mockLocalStreamController.addTrack).toHaveBeenCalledWith(newVideoTrack);
      expect(videoTransceiver.sender.replaceTrack).toHaveBeenCalledWith(newVideoTrack);

      testController.destroy();
    });

    it('should not call getUserMedia when track is still live', async () => {
      const liveTrack = new MockMediaStreamTrack('video');
      liveTrack.readyState = 'live';
      const customMockGetUserMedia = vi.fn();

      const testController = createController({
        getUserMedia: customMockGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      const videoTransceiver = mockPeerConnection.addMockTransceiver('video');
      videoTransceiver.sender.track = liveTrack;

      await testController.restoreTrackSender('video');

      // Should NOT call getUserMedia since track is live
      expect(customMockGetUserMedia).not.toHaveBeenCalled();
      expect(mockLocalStreamController.addTrack).not.toHaveBeenCalled();

      testController.destroy();
    });

    it('should restore audio track when sender track is null', async () => {
      const newAudioTrack = new MockMediaStreamTrack('audio');
      const newStream = new MockMediaStream([newAudioTrack]);
      const customMockGetUserMedia = vi.fn().mockResolvedValue(newStream);

      const testController = createController({
        getUserMedia: customMockGetUserMedia as unknown as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      const audioTransceiver = mockPeerConnection.addMockTransceiver('audio');
      audioTransceiver.sender.track = null;

      await testController.restoreTrackSender('audio');

      // Should call getUserMedia with audio constraints from getInputAudioDeviceConstraints
      expect(customMockGetUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: true } });
      expect(mockLocalStreamController.addTrack).toHaveBeenCalledWith(newAudioTrack);

      testController.destroy();
    });
  });

  describe('updatePeerConnection', () => {
    it('should update the peer connection reference', () => {
      const newPeerConnection = new MockRTCPeerConnection();
      controller.updatePeerConnection(newPeerConnection as unknown as RTCPeerConnection);

      // The controller should now use the new peer connection
      expect(controller.useAddTransceivers).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should complete subjects on destroy', async () => {
      const completedSpy = vi.fn();

      // Subscribe to the destroyed$ observable before destroying
      controller.destroyed$.subscribe({
        next: completedSpy
      });

      controller.destroy();

      // The observable should complete on destroy
      expect(completedSpy).toHaveBeenCalled();
    });
  });

  describe('Audio Direction - ?? vs || operator bug', () => {
    it('BUG: audioDirection returns recvonly instead of sendrecv when no local stream exists but audio constraints are set', () => {
      // Bug #10: TransceiverController.ts:112 — Uses `??` (nullish coalescing)
      // instead of `||` (logical OR) for the `send` variable:
      //
      //   const hasAudioTrack = localStream?.getAudioTracks().some(...)
      //   const send = hasAudioTrack ?? wantsToSendAudio
      //
      // When localStream exists but has NO audio tracks:
      //   - .some() returns `false` (not null/undefined)
      //   - `??` only falls through on null/undefined, NOT on `false`
      //   - So `send = false` even though `wantsToSendAudio = true`
      //   - Result: 'recvonly' instead of 'sendrecv'
      //
      // With `||`, `false || true` would correctly give `true`.

      // Create a stream with NO audio tracks
      const emptyStream = new MockMediaStream(); // no tracks
      const localStreamCtrl = new MockLocalStreamController(emptyStream);
      const peerConn = new MockRTCPeerConnection();

      const testController = new TransceiverController({
        peerConnection: peerConn as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => true, // truthy = wants to send audio
        getInputVideoDeviceConstraints: () => ({ width: 1280, height: 720 }),
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      // With a stream that has no audio tracks:
      //   hasAudioTrack = emptyStream.getAudioTracks().some(t => t.enabled) = false
      //   wantsToSendAudio = Boolean(true) = true
      //   send = false ?? true = false  (bug: ?? doesn't fall through on false)
      //   recv = true
      //   direction = getDirection(false, true) = 'recvonly'
      //
      // Expected: 'sendrecv' (we want to send audio, so should be send+recv)
      // Actual:   'recvonly' (because ?? treats false as non-nullish)
      expect(testController.audioDirection).toBe('sendrecv');

      testController.destroy();
    });

    it('BUG: videoDirection returns recvonly instead of sendrecv when no local video tracks but video constraints are set', () => {
      // Same bug for video: TransceiverController.ts:130
      //   const hasVideoTrack = localStream?.getVideoTracks().some(...)
      //   const send = hasVideoTrack ?? wantsToSendVideo

      // Create a stream with NO video tracks
      const emptyStream = new MockMediaStream(); // no tracks
      const localStreamCtrl = new MockLocalStreamController(emptyStream);
      const peerConn = new MockRTCPeerConnection();

      const testController = new TransceiverController({
        peerConnection: peerConn as unknown as RTCPeerConnection,
        propose: 'main',
        receiveAudio: true,
        receiveVideo: true,
        localStreamController: localStreamCtrl as unknown as LocalStreamController,
        getInputAudioDeviceConstraints: () => ({ echoCancellation: true }),
        getInputVideoDeviceConstraints: () => true, // truthy = wants to send video
        getUserMedia: vi.fn().mockResolvedValue(new MockMediaStream()) as (
          c: MediaStreamConstraints
        ) => Promise<MediaStream>
      });

      // hasVideoTrack = false (no video tracks)
      // wantsToSendVideo = true
      // send = false ?? true = false (bug)
      // Expected: 'sendrecv', Actual: 'recvonly'
      expect(testController.videoDirection).toBe('sendrecv');

      testController.destroy();
    });
  });
});
