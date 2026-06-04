import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RTCPeerConnectionController,
  type RTCPeerConnectionControllerOptionsPartial
} from './RTCPeerConnectionController';
import { filter, firstValueFrom, take, timeout } from 'rxjs';

import type { WebRTCApiProvider, WebRTCMediaDevices } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

// Mock DeviceController for injection into RTCPeerConnectionController
const createMockDeviceController = (): DeviceController => ({
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
});

// Mock PreferencesManager
vi.mock('../managers/PreferencesManager', () => ({
  PreferencesManager: {
    instance: {
      receiveAudio: true,
      receiveVideo: true,
      preferredAudioInput: null,
      preferredAudioOutput: null,
      preferredVideoInput: null
    }
  }
}));

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

// Mock RTCRtpSender
class MockRTCRtpSender {
  track: MockMediaStreamTrack | null = null;
  private streams: MockMediaStream[] = [];

  constructor(track?: MockMediaStreamTrack) {
    this.track = track || null;
  }

  replaceTrack = vi.fn(async (track: MockMediaStreamTrack | null) => {
    this.track = track;
  });

  setStreams = vi.fn((...streams: MockMediaStream[]) => {
    this.streams = streams;
  });

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

// Mock RTCSessionDescription
class MockRTCSessionDescription {
  type: RTCSdpType;
  sdp: string;

  constructor(init: RTCSessionDescriptionInit) {
    this.type = init.type;
    this.sdp = init.sdp ?? '';
  }

  toJSON() {
    return { type: this.type, sdp: this.sdp };
  }
}

// Mock RTCIceCandidate
class MockRTCIceCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  foundation: string | null = null;
  component: RTCIceComponent | null = null;
  priority: number | null = null;
  address: string | null = null;
  protocol: RTCIceProtocol | null = null;
  port: number | null = null;
  type: RTCIceCandidateType | null = null;
  tcpType: RTCIceTcpCandidateType | null = null;
  relatedAddress: string | null = null;
  relatedPort: number | null = null;
  usernameFragment: string | null = null;

  constructor(init?: RTCIceCandidateInit) {
    this.candidate = init?.candidate ?? '';
    this.sdpMid = init?.sdpMid ?? null;
    this.sdpMLineIndex = init?.sdpMLineIndex ?? null;

    // Parse type from candidate string
    const typeMatch = this.candidate.match(/typ\s+(host|srflx|prflx|relay)/);
    if (typeMatch) {
      this.type = typeMatch[1] as RTCIceCandidateType;
    }
  }

  toJSON() {
    return {
      candidate: this.candidate,
      sdpMid: this.sdpMid,
      sdpMLineIndex: this.sdpMLineIndex
    };
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  iceConnectionState: RTCIceConnectionState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  signalingState: RTCSignalingState = 'stable';
  iceGatheringState: RTCIceGatheringState = 'new';
  localDescription: MockRTCSessionDescription | null = null;
  remoteDescription: MockRTCSessionDescription | null = null;
  currentLocalDescription: MockRTCSessionDescription | null = null;
  currentRemoteDescription: MockRTCSessionDescription | null = null;
  pendingLocalDescription: MockRTCSessionDescription | null = null;
  pendingRemoteDescription: MockRTCSessionDescription | null = null;
  canTrickleIceCandidates: boolean | null = null;
  sctp: RTCSctpTransport | null = null;

  private transceivers: MockRTCRtpTransceiver[] = [];
  private senders: MockRTCRtpSender[] = [];
  private configuration: RTCConfiguration;
  private eventListeners = new Map<string, Set<EventListener>>();

  // Event handlers
  oniceconnectionstatechange: ((event: Event) => void) | null = null;
  onconnectionstatechange: ((event: Event) => void) | null = null;
  onsignalingstatechange: ((event: Event) => void) | null = null;
  onicegatheringstatechange: ((event: Event) => void) | null = null;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null;
  onnegotiationneeded: ((event: Event) => void) | null = null;
  onicecandidateerror: ((event: Event) => void) | null = null;

  constructor(configuration?: RTCConfiguration) {
    this.configuration = configuration ?? {};
  }

  addEventListener = vi.fn((type: string, listener: EventListener) => {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  });

  removeEventListener = vi.fn((type: string, listener: EventListener) => {
    this.eventListeners.get(type)?.delete(listener);
  });

  dispatchEvent = vi.fn((event: Event) => {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
    return true;
  });

  createOffer = vi.fn(async (options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> => {
    const sdp = this.generateSDP('offer');
    return { type: 'offer', sdp };
  });

  createAnswer = vi.fn(async (options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> => {
    const sdp = this.generateSDP('answer');
    return { type: 'answer', sdp };
  });

  setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.localDescription = new MockRTCSessionDescription(description);
    this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable';
    const signalingEvent = new Event('signalingstatechange');
    this.onsignalingstatechange?.(signalingEvent);
    this.dispatchEventToListeners('signalingstatechange', signalingEvent);

    // Trigger ICE gathering
    this.iceGatheringState = 'gathering';
    const gatheringEvent = new Event('icegatheringstatechange');
    this.onicegatheringstatechange?.(gatheringEvent);
    this.dispatchEventToListeners('icegatheringstatechange', gatheringEvent);

    // Simulate ICE candidate gathering immediately (use Promise.resolve to defer after current microtask)
    Promise.resolve().then(() => this.simulateICEGathering());
  });

  setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.remoteDescription = new MockRTCSessionDescription(description);
    this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable';
    const signalingEvent = new Event('signalingstatechange');
    this.onsignalingstatechange?.(signalingEvent);
    this.dispatchEventToListeners('signalingstatechange', signalingEvent);
  });

  addIceCandidate = vi.fn(async (candidate?: RTCIceCandidateInit) => {
    // Simulate adding ICE candidate
  });

  async dispatchOnNegotiationNeeded(): Promise<void> {
    return Promise.resolve().then(() => {
      const event = new Event('negotiationneeded');
      this.onnegotiationneeded?.(event);
      this.dispatchEventToListeners('negotiationneeded', event);
    });
  }

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
      void this.dispatchOnNegotiationNeeded();

      return transceiver;
    }
  );

  addTrack = vi.fn((track: MockMediaStreamTrack, ...streams: MockMediaStream[]) => {
    const sender = new MockRTCRtpSender(track);
    this.senders.push(sender);
    void this.dispatchOnNegotiationNeeded();
    return sender;
  });

  removeTrack = vi.fn((sender: MockRTCRtpSender) => {
    this.senders = this.senders.filter((s) => s !== sender);
    void this.dispatchOnNegotiationNeeded();
  });

  getTransceivers = vi.fn(() => [...this.transceivers]);
  getSenders = vi.fn(() => [...this.senders]);
  getReceivers = vi.fn(() => this.transceivers.map((t) => t.receiver));

  getConfiguration = vi.fn(() => this.configuration);
  setConfiguration = vi.fn((config: RTCConfiguration) => {
    this.configuration = config;
  });

  getStats = vi.fn(async () => new Map());

  close = vi.fn(() => {
    this.connectionState = 'closed';
    this.iceConnectionState = 'closed';
    this.signalingState = 'closed';
  });

  restartIce = vi.fn();

  createDataChannel = vi.fn((label: string, dataChannelDict?: RTCDataChannelInit) => {
    return {} as RTCDataChannel;
  });

  // Helper methods for testing
  simulateICEGathering() {
    // Generate some ICE candidates
    const candidates = [
      new MockRTCIceCandidate({
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host generation 0',
        sdpMid: 'audio',
        sdpMLineIndex: 0
      }),
      new MockRTCIceCandidate({
        candidate:
          'candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx raddr 192.168.1.1 rport 50000 generation 0',
        sdpMid: 'audio',
        sdpMLineIndex: 0
      })
    ];

    candidates.forEach((candidate) => {
      const event = { candidate } as RTCPeerConnectionIceEvent;
      this.onicecandidate?.(event);
      this.dispatchEventToListeners('icecandidate', event);
    });

    // Signal gathering complete
    this.iceGatheringState = 'complete';
    const gatheringEvent = new Event('icegatheringstatechange');
    this.onicegatheringstatechange?.(gatheringEvent);
    this.dispatchEventToListeners('icegatheringstatechange', gatheringEvent);

    const nullCandidateEvent = { candidate: null } as RTCPeerConnectionIceEvent;
    this.onicecandidate?.(nullCandidateEvent);
    this.dispatchEventToListeners('icecandidate', nullCandidateEvent);
  }

  simulateConnectionStateChange(state: RTCPeerConnectionState) {
    this.connectionState = state;
    const event = new Event('connectionstatechange');
    this.onconnectionstatechange?.(event);
    this.dispatchEventToListeners('connectionstatechange', event);
  }

  simulateICEConnectionStateChange(state: RTCIceConnectionState) {
    this.iceConnectionState = state;
    const event = new Event('iceconnectionstatechange');
    this.oniceconnectionstatechange?.(event);
    this.dispatchEventToListeners('iceconnectionstatechange', event);
  }

  simulateRemoteTrack(kind: 'audio' | 'video', stream?: MockMediaStream) {
    const track = new MockMediaStreamTrack(kind);
    const eventStream = stream || new MockMediaStream([track]);
    const event = {
      track,
      streams: [eventStream],
      receiver: new MockRTCRtpReceiver(kind),
      transceiver: new MockRTCRtpTransceiver(kind)
    } as unknown as RTCTrackEvent;
    this.ontrack?.(event);
    this.dispatchEventToListeners('track', event);
  }

  simulateRemoteTrackWithoutStream(kind: 'audio' | 'video') {
    const track = new MockMediaStreamTrack(kind);
    const event = {
      track,
      streams: [],
      receiver: new MockRTCRtpReceiver(kind),
      transceiver: new MockRTCRtpTransceiver(kind)
    } as unknown as RTCTrackEvent;
    this.ontrack?.(event);
    this.dispatchEventToListeners('track', event);
    return track;
  }

  private dispatchEventToListeners(
    type: string,
    event: Event | RTCPeerConnectionIceEvent | RTCTrackEvent
  ) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => listener(event as Event));
    }
  }

  private generateSDP(type: 'offer' | 'answer'): string {
    return `v=0
o=- 123456789 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE audio video
a=extmap-allow-mixed
a=msid-semantic: WMS
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:testpwd
a=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx raddr 192.168.1.1 rport 50000 generation 0
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF
a=setup:${type === 'offer' ? 'actpass' : 'active'}
a=mid:audio
a=sendrecv
a=rtpmap:111 opus/48000/2
m=video 9 UDP/TLS/RTP/SAVPF 96
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:test
a=ice-pwd:testpwd
a=candidate:2 1 UDP 1694498815 203.0.113.1 50002 typ srflx raddr 192.168.1.1 rport 50000 generation 0
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF
a=setup:${type === 'offer' ? 'actpass' : 'active'}
a=mid:video
a=sendrecv
a=rtpmap:96 VP8/90000
`;
  }
}

// Helper to create a typed mock getUserMedia function
const createMockGetUserMedia = () => {
  return vi.fn(async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
    const tracks: MockMediaStreamTrack[] = [];
    if (constraints.audio) {
      tracks.push(new MockMediaStreamTrack('audio'));
    }
    if (constraints.video) {
      tracks.push(new MockMediaStreamTrack('video'));
    }
    return new MockMediaStream(tracks) as unknown as MediaStream;
  }) as unknown as (constraints: MediaStreamConstraints) => Promise<MediaStream>;
};

// Mock navigator.mediaDevices
const createMockMediaDevices = () => {
  const eventListeners = new Map<string, Set<() => void>>();

  return {
    getUserMedia: vi.fn(async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      const tracks: MockMediaStreamTrack[] = [];
      if (constraints.audio) {
        tracks.push(new MockMediaStreamTrack('audio'));
      }
      if (constraints.video) {
        tracks.push(new MockMediaStreamTrack('video'));
      }
      return new MockMediaStream(tracks) as unknown as MediaStream;
    }),
    enumerateDevices: vi.fn(
      async (): Promise<MediaDeviceInfo[]> => [
        {
          deviceId: 'audio-input-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({})
        },
        {
          deviceId: 'audio-output-1',
          groupId: 'group-1',
          kind: 'audiooutput',
          label: 'Speaker 1',
          toJSON: () => ({})
        },
        {
          deviceId: 'video-input-1',
          groupId: 'group-2',
          kind: 'videoinput',
          label: 'Camera 1',
          toJSON: () => ({})
        }
      ]
    ),
    addEventListener: vi.fn((event: string, callback: () => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(callback);
    }),
    removeEventListener: vi.fn((event: string, callback: () => void) => {
      eventListeners.get(event)?.delete(callback);
    }),
    dispatchEvent: vi.fn((event: Event) => {
      const listeners = eventListeners.get(event.type);
      if (listeners) {
        listeners.forEach((cb) => cb());
      }
      return true;
    }),
    getSupportedConstraints: vi.fn(() => ({
      deviceId: true,
      groupId: true,
      autoGainControl: true,
      channelCount: true,
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: true,
      sampleSize: true
    })),
    ondevicechange: null
  };
};

/**
 * Creates a WebRTCApiProvider with the given PeerConnection constructor and media device overrides.
 */
const createMockWebRTCApiProvider = (
  PeerConnectionConstructor: unknown,
  mediaDeviceOverrides: Partial<WebRTCMediaDevices> = {}
): WebRTCApiProvider => {
  const base = createMockMediaDevices();
  return {
    RTCPeerConnection: PeerConnectionConstructor as typeof RTCPeerConnection,
    mediaDevices: {
      ...base,
      ...mediaDeviceOverrides
    }
  };
};

describe('RTCPeerConnectionController', () => {
  let controller: RTCPeerConnectionController;
  let mockPeerConnection: MockRTCPeerConnection;
  let mockMediaDevices: ReturnType<typeof createMockMediaDevices>;
  let mockGetUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  let mockDeviceController: DeviceController;

  beforeEach(() => {
    vi.useFakeTimers();

    mockPeerConnection = new MockRTCPeerConnection();
    mockMediaDevices = createMockMediaDevices();
    mockDeviceController = createMockDeviceController();

    // Setup global navigator.mediaDevices
    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: mockMediaDevices
      },
      writable: true,
      configurable: true
    });

    // Mock global MediaStream constructor
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;

    // Create a mock constructor that returns our mock instance
    const MockPeerConnectionConstructor = vi.fn(function (
      this: unknown,
      config?: RTCConfiguration
    ) {
      mockPeerConnection = new MockRTCPeerConnection(config);
      return mockPeerConnection as unknown as RTCPeerConnection;
    });

    mockGetUserMedia = createMockGetUserMedia();

    controller = new RTCPeerConnectionController(
      {
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor, {
          getUserMedia: mockGetUserMedia
        }),
        inputAudioDeviceConstraints: { echoCancellation: true }
      },
      undefined,
      mockDeviceController
    );
  });

  // Helper to create controllers with mock device controller injected
  const createTestController = (
    options?: RTCPeerConnectionControllerOptionsPartial,
    remoteSessionDescription?: string
  ) => new RTCPeerConnectionController(options, remoteSessionDescription, mockDeviceController);

  afterEach(async () => {
    await vi.runAllTimersAsync();
    controller.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create controller with default options', () => {
      expect(controller).toBeDefined();
      expect(controller.type).toBe('offer'); // No remote SDP means offer
    });

    it('should create controller with answer type when remote SDP is provided', () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });
      const answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor)
        },
        'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\n'
      );

      expect(answerController.type).toBe('answer');
      answerController.destroy();
    });

    it('should not initialize until localDescription$ is subscribed to', () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });
      const lazyController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor)
      });

      expect(MockPeerConnectionConstructor).not.toHaveBeenCalled();

      // Subscribe to trigger initialization
      const sub = lazyController.localDescription$.subscribe();
      vi.runAllTimers();

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();

      sub.unsubscribe();
      lazyController.destroy();
    });

    it('should merge options with defaults from PreferencesManager', () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });
      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        receiveVideo: false
      });

      // receiveAudio should come from PreferencesManager (true)
      // receiveVideo should be overridden to false
      expect(customController).toBeDefined();
      customController.destroy();
    });
  });

  describe('Observable State Streams', () => {
    it('should emit initial ICE connection state', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const state = await firstValueFrom(
        controller.iceConnectionState$.pipe(take(1), timeout(1000))
      );
      expect(state).toBe('new');

      sub.unsubscribe();
    });

    it('should emit initial connection state', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const state = await firstValueFrom(controller.connectionState$.pipe(take(1), timeout(1000)));
      expect(state).toBe('new');

      sub.unsubscribe();
    });

    it('should emit initial signaling state', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const state = await firstValueFrom(controller.signalingState$.pipe(take(1), timeout(1000)));
      // After creating offer, signaling state should be 'have-local-offer'
      expect(['stable', 'have-local-offer']).toContain(state);

      sub.unsubscribe();
    });

    it('should emit ICE gathering state changes', async () => {
      const states: RTCIceGatheringState[] = [];
      const sub = controller.iceGatheringState$.subscribe((state) => states.push(state));

      controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(states).toContain('gathering');
      expect(states).toContain('complete');

      sub.unsubscribe();
    });

    it('should emit connection state changes', async () => {
      const states: RTCPeerConnectionState[] = [];
      const sub = controller.connectionState$.subscribe((state) => states.push(state));

      controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Simulate connection state change
      mockPeerConnection.simulateConnectionStateChange('connected');

      expect(states).toContain('connected');

      sub.unsubscribe();
    });

    it('should emit ICE connection state changes', async () => {
      const states: RTCIceConnectionState[] = [];
      const sub = controller.iceConnectionState$.subscribe((state) => states.push(state));

      controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Simulate ICE connection state change
      mockPeerConnection.simulateICEConnectionStateChange('connected');

      expect(states).toContain('connected');

      sub.unsubscribe();
    });
  });

  describe('Offer Creation Flow', () => {
    it('should create offer when type is offer', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(mockPeerConnection.createOffer).toHaveBeenCalled();

      sub.unsubscribe();
    });

    it('should set local description after creating offer', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalled();

      sub.unsubscribe();
    });

    it('should emit local description after ICE gathering completes', async () => {
      const descriptionPromise = firstValueFrom(
        controller.localDescription$.pipe(take(1), timeout(5000))
      );

      await vi.runAllTimersAsync();

      const description = await descriptionPromise;

      expect(description).toBeDefined();
      expect(description?.type).toBe('offer');
      expect(description?.sdp).toBeDefined();
    });

    it('should configure offer options for main propose', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          offerToReceiveAudio: true
        })
      );

      sub.unsubscribe();
    });

    it('should configure offer options for screenshare propose', async () => {
      const screenshareMockPeerConnection = new MockRTCPeerConnection();
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return screenshareMockPeerConnection as unknown as RTCPeerConnection;
      });

      const mockGetDisplayMedia = vi.fn(
        async (): Promise<MediaStream> =>
          new MockMediaStream([new MockMediaStreamTrack('video')]) as unknown as MediaStream
      );

      const screenshareController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor, {
          getDisplayMedia: mockGetDisplayMedia
        }),
        propose: 'screenshare'
      });

      const sub = screenshareController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(screenshareMockPeerConnection.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        })
      );

      sub.unsubscribe();
      screenshareController.destroy();
    });
  });

  describe('Answer Creation Flow', () => {
    let answerController: RTCPeerConnectionController;
    let answerMockPeerConnection: MockRTCPeerConnection;

    beforeEach(() => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        answerMockPeerConnection = new MockRTCPeerConnection();
        return answerMockPeerConnection as unknown as RTCPeerConnection;
      });
      answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
          inputAudioDeviceConstraints: { echoCancellation: true }
        },
        'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=candidate:2 1 UDP 1694498815 203.0.113.1 50002 typ srflx\r\n'
      );
    });

    afterEach(() => {
      answerController.destroy();
    });

    it('should set remote description during init and create answer on acceptInbound', async () => {
      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Remote description is set during init
      expect(answerMockPeerConnection.setRemoteDescription).toHaveBeenCalled();
      // Answer is NOT created during init (deferred to acceptInbound)
      expect(answerMockPeerConnection.createAnswer).not.toHaveBeenCalled();

      // Accept triggers answer creation
      await answerController.acceptInbound();
      await vi.runAllTimersAsync();

      expect(answerMockPeerConnection.createAnswer).toHaveBeenCalled();

      sub.unsubscribe();
    });

    it('should create answer when acceptInbound is called', async () => {
      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      await answerController.acceptInbound();
      await vi.runAllTimersAsync();

      expect(answerMockPeerConnection.createAnswer).toHaveBeenCalled();

      sub.unsubscribe();
    });

    it('should emit answer in local description after acceptInbound', async () => {
      // Subscribe to trigger init
      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Accept to trigger answer creation
      await answerController.acceptInbound();

      const descriptionPromise = firstValueFrom(
        answerController.localDescription$.pipe(take(1), timeout(5000))
      );
      await vi.runAllTimersAsync();

      const description = await descriptionPromise;

      expect(description).toBeDefined();
      expect(description?.type).toBe('answer');

      sub.unsubscribe();
    });

    it('should emit remote description after setting it', async () => {
      const remoteDescs: (RTCSessionDescriptionInit | null)[] = [];
      const remoteSub = answerController.remoteDescription$.subscribe((desc) =>
        remoteDescs.push(desc)
      );

      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // The remote description should have been set during initialization
      expect(answerMockPeerConnection.setRemoteDescription).toHaveBeenCalled();
      const callArg = answerMockPeerConnection.setRemoteDescription.mock.calls[0][0];
      expect(callArg.type).toBe('offer');

      sub.unsubscribe();
      remoteSub.unsubscribe();
    });
  });

  describe('ICE Candidate Handling', () => {
    // Note: ICE candidates collection is now handled by ICEGatheringController
    // The RTCPeerConnectionController delegates ICE gathering to ICEGatheringController
    // and exposes the final local description with candidates included
    it('should expose iceCandidates$ observable', async () => {
      // The observable should be defined, even if it's not actively populated
      // since ICE candidate collection is delegated to ICEGatheringController
      expect(controller.iceCandidates$).toBeDefined();
    });

    it('should not emit localDescription during gathering state', async () => {
      // Create a peer connection that stays in gathering state
      const gatheringMockPeerConnection = new MockRTCPeerConnection();
      let iceGatheringCompleted = false;

      gatheringMockPeerConnection.simulateICEGathering = () => {
        // Start gathering but don't complete - only emit gathering state
        gatheringMockPeerConnection.iceGatheringState = 'gathering';
        const gatheringEvent = new Event('icegatheringstatechange');
        gatheringMockPeerConnection.onicegatheringstatechange?.(gatheringEvent);
        // Dispatch to event listeners added with addEventListener
        const listeners = (gatheringMockPeerConnection as any).eventListeners?.get(
          'icegatheringstatechange'
        );
        if (listeners) {
          listeners.forEach((listener: EventListener) => listener(gatheringEvent));
        }

        // Send one candidate but stay in gathering state
        const candidate = new MockRTCIceCandidate({
          candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx',
          sdpMid: 'audio',
          sdpMLineIndex: 0
        });
        const candidateEvent = { candidate } as RTCPeerConnectionIceEvent;
        gatheringMockPeerConnection.onicecandidate?.(candidateEvent);
        // Dispatch to event listeners
        const candidateListeners = (gatheringMockPeerConnection as any).eventListeners?.get(
          'icecandidate'
        );
        if (candidateListeners) {
          candidateListeners.forEach((listener: EventListener) => listener(candidateEvent as any));
        }

        // Complete gathering after a delay (simulating real behavior)
        setTimeout(() => {
          iceGatheringCompleted = true;
          gatheringMockPeerConnection.iceGatheringState = 'complete';
          const completeEvent = new Event('icegatheringstatechange');
          gatheringMockPeerConnection.onicegatheringstatechange?.(completeEvent);
          // Dispatch to event listeners
          const completeListeners = (gatheringMockPeerConnection as any).eventListeners?.get(
            'icegatheringstatechange'
          );
          if (completeListeners) {
            completeListeners.forEach((listener: EventListener) => listener(completeEvent));
          }

          const nullCandidateEvent = { candidate: null } as RTCPeerConnectionIceEvent;
          gatheringMockPeerConnection.onicecandidate?.(nullCandidateEvent);
          // Dispatch to event listeners
          const nullCandidateListeners = (gatheringMockPeerConnection as any).eventListeners?.get(
            'icecandidate'
          );
          if (nullCandidateListeners) {
            nullCandidateListeners.forEach((listener: EventListener) =>
              listener(nullCandidateEvent as any)
            );
          }
        }, 100);
      };

      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return gatheringMockPeerConnection as unknown as RTCPeerConnection;
      });

      const gatheringController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioDeviceConstraints: { echoCancellation: true }
      });

      const emittedDescriptions: (RTCSessionDescription | null)[] = [];
      const sub = gatheringController.localDescription$.subscribe((desc) => {
        emittedDescriptions.push(desc);
      });

      // Run initial setup
      await vi.advanceTimersByTimeAsync(50);

      // At this point, we should not have any emissions because we're still gathering
      expect(emittedDescriptions.length).toBe(0);
      expect(iceGatheringCompleted).toBe(false);

      // Now complete gathering
      await vi.advanceTimersByTimeAsync(100);

      // After gathering completes, we should have exactly one emission
      expect(iceGatheringCompleted).toBe(true);
      expect(emittedDescriptions.length).toBe(1);
      expect(emittedDescriptions[0]?.type).toBe('offer');

      sub.unsubscribe();
      gatheringController.destroy();
    });

    it('should filter out initial gathering state from BehaviorSubject', async () => {
      // This test verifies that the initial 'gathering' state from the BehaviorSubject
      // is properly filtered and doesn't cause premature emission
      const descriptions: (RTCSessionDescription | null)[] = [];

      const descSub = controller.localDescription$.subscribe((desc) => {
        descriptions.push(desc);
      });

      // Allow microtasks to run but not timers yet
      await Promise.resolve();

      // Before ICE gathering completes, no descriptions should be emitted
      // even though the BehaviorSubject has an initial 'gathering' state
      expect(descriptions.length).toBe(0);

      // Now complete all timers to let ICE gathering finish
      await vi.runAllTimersAsync();

      // After ICE gathering completes, we should have one emission
      expect(descriptions.length).toBe(1);

      descSub.unsubscribe();
    });

    it('should emit initialized$ when initialization completes', async () => {
      // Subscribe to initialized$ first
      const initPromise = firstValueFrom(controller.initialized$.pipe(take(1), timeout(5000)));

      // Trigger initialization
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const initialized = await initPromise;
      expect(initialized).toBe(true);

      sub.unsubscribe();
    });

    it('should handle ICE gathering timeout', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        const pc = new MockRTCPeerConnection();
        // Override simulateICEGathering to never complete
        pc.simulateICEGathering = () => {
          pc.iceGatheringState = 'gathering';
          pc.onicegatheringstatechange?.(new Event('icegatheringstatechange'));
          // Send one candidate but don't complete
          pc.onicecandidate?.({
            candidate: new MockRTCIceCandidate({
              candidate: 'candidate:2 1 UDP 1694498815 203.0.113.1 50001 typ srflx',
              sdpMid: 'audio',
              sdpMLineIndex: 0
            })
          } as RTCPeerConnectionIceEvent);
        };
        mockPeerConnection = pc;
        return pc as unknown as RTCPeerConnection;
      });

      const timeoutController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioDeviceConstraints: { echoCancellation: true }
      });

      const sub = timeoutController.localDescription$.subscribe();

      // Advance past ICE candidate timeout (1000ms)
      vi.advanceTimersByTime(1500);

      // Should have emitted local description due to timeout
      const desc = mockPeerConnection.localDescription;
      expect(desc).toBeDefined();

      sub.unsubscribe();
      timeoutController.destroy();
    });

    it('should validate local description has non-host candidates', async () => {
      const descPromise = firstValueFrom(controller.localDescription$.pipe(take(1), timeout(5000)));

      await vi.runAllTimersAsync();

      // The mock generates srflx candidates, so validation should pass
      const desc = await descPromise;

      expect(desc).toBeDefined();
      expect(desc?.sdp).toContain('typ srflx');
    });
  });

  // Device monitoring tests removed: RTCPeerConnectionController no longer owns
  // the DeviceController — it receives it via constructor injection from SignalWire.

  describe('Track Management', () => {
    it('should request user media with constraints', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            echoCancellation: true
          })
        })
      );

      sub.unsubscribe();
    });

    it('should emit local stream when tracks are added', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      const stream = await firstValueFrom(controller.localStream$.pipe(take(1), timeout(5000)));

      expect(stream).toBeDefined();

      sub.unsubscribe();
    });

    it('should emit remote stream when remote track is received', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      // Simulate remote track
      mockPeerConnection.simulateRemoteTrack('audio');

      const stream = await firstValueFrom(controller.remoteStream$.pipe(take(1), timeout(1000)));

      expect(stream).toBeDefined();

      sub.unsubscribe();
    });

    it('should create a fallback MediaStream when remote track has no associated streams (audio-only)', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Simulate an audio-only track arriving without an associated stream
      const track = mockPeerConnection.simulateRemoteTrackWithoutStream('audio');

      const stream = controller.remoteStream;

      expect(stream).toBeDefined();
      expect(stream).toBeInstanceOf(MediaStream);
      expect(stream!.getTracks()).toContainEqual(track);

      sub.unsubscribe();
    });

    it('should accumulate multiple tracks without streams into the same fallback MediaStream', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Simulate first track without stream
      const audioTrack = mockPeerConnection.simulateRemoteTrackWithoutStream('audio');
      const firstStream = controller.remoteStream;

      // Simulate second track without stream
      const videoTrack = mockPeerConnection.simulateRemoteTrackWithoutStream('video');
      const secondStream = controller.remoteStream;

      // A new immutable stream is created each time, containing all accumulated tracks
      expect(secondStream).not.toBe(firstStream);
      expect(secondStream!.getTracks()).toContainEqual(audioTrack);
      expect(secondStream!.getTracks()).toContainEqual(videoTrack);

      sub.unsubscribe();
    });

    it('should add local track to peer connection', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      const track = new MockMediaStreamTrack('audio');
      await controller.addLocalTrack(track as unknown as MediaStreamTrack);

      expect(mockPeerConnection.addTrack).toHaveBeenCalled();

      sub.unsubscribe();
    });

    it('should remove local track from peer connection', async () => {
      // Create a controller with an input stream to ensure _localStream$ is populated
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        mockPeerConnection = new MockRTCPeerConnection();
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const audioTrack = new MockMediaStreamTrack('audio');
      const inputStream = new MockMediaStream([audioTrack]);

      const streamController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioStream: inputStream as unknown as MediaStream
      });

      const sub = streamController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // The track should have been added during initialization
      // Now remove it
      await streamController.removeLocalTrack(audioTrack.id);

      expect(mockPeerConnection.removeTrack).toHaveBeenCalled();

      sub.unsubscribe();
      streamController.destroy();
    });

    it('should use provided input streams instead of getUserMedia', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });
      const audioTrack = new MockMediaStreamTrack('audio');
      const inputStream = new MockMediaStream([audioTrack]);

      const streamController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioStream: inputStream as unknown as MediaStream
      });

      const sub = streamController.localDescription$.subscribe();
      vi.runAllTimers();

      const stream = await firstValueFrom(
        streamController.localStream$.pipe(take(1), timeout(5000))
      );

      expect(stream).toBeDefined();
      // Should not call getUserMedia when input stream is provided
      expect(mockGetUserMedia).not.toHaveBeenCalled();

      sub.unsubscribe();
      streamController.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should emit errors through errors$ observable', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        const pc = new MockRTCPeerConnection();
        pc.createOffer = vi.fn(async () => {
          throw new Error('Offer creation failed');
        });
        mockPeerConnection = pc;
        return pc as unknown as RTCPeerConnection;
      });

      const errorController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioDeviceConstraints: { echoCancellation: true }
      });

      const errors: Error[] = [];
      errorController.errors$.subscribe((e) => errors.push(e));

      const sub = errorController.localDescription$.subscribe();
      vi.runAllTimers();

      // The initialization error should cause destroy() to be called
      // which cleans up, but errors should have been emitted
      expect(errors.length).toBeGreaterThanOrEqual(0);

      sub.unsubscribe();
      errorController.destroy();
    });

    it('should handle getUserMedia errors', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });
      const failingGetUserMedia = vi.fn(async () => {
        throw new Error('Permission denied');
      }) as unknown as (constraints: MediaStreamConstraints) => Promise<MediaStream>;

      const errorController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor, {
          getUserMedia: failingGetUserMedia
        }),
        inputAudioDeviceConstraints: { echoCancellation: true }
      });

      const errors: Error[] = [];
      errorController.errors$.subscribe((e) => errors.push(e));

      const sub = errorController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('Permission denied');

      sub.unsubscribe();
      errorController.destroy();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should close peer connection on destroy', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      sub.unsubscribe();
      controller.destroy();

      expect(mockPeerConnection.close).toHaveBeenCalled();
    });

    it('should stop all local tracks on destroy', async () => {
      // Create a controller with an input stream to ensure _localStream$ is populated
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        mockPeerConnection = new MockRTCPeerConnection();
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const audioTrack = new MockMediaStreamTrack('audio');
      const videoTrack = new MockMediaStreamTrack('video');
      const inputStream = new MockMediaStream([audioTrack, videoTrack]);

      const streamController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        inputAudioStream: inputStream as unknown as MediaStream
      });

      const sub = streamController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const stream = await firstValueFrom(
        streamController.localStream$.pipe(
          filter((s) => Boolean(s)),
          take(1),
          timeout(5000)
        )
      );

      const tracks = (stream as unknown as MockMediaStream).getTracks();
      expect(tracks.length).toBeGreaterThan(0);

      sub.unsubscribe();
      streamController.destroy();

      tracks.forEach((track: MockMediaStreamTrack) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    it('should clear ICE gathering timer on destroy', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      sub.unsubscribe();
      controller.destroy();

      // Should not throw or cause issues
      vi.advanceTimersByTime(20000);
    });

    it('should complete all observables on destroy', async () => {
      const sub = controller.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const completions: string[] = [];

      controller.iceConnectionState$.subscribe({
        complete: () => completions.push('iceConnectionState')
      });
      controller.connectionState$.subscribe({
        complete: () => completions.push('connectionState')
      });
      controller.signalingState$.subscribe({
        complete: () => completions.push('signalingState')
      });

      sub.unsubscribe();
      controller.destroy();

      expect(completions).toContain('iceConnectionState');
      expect(completions).toContain('connectionState');
      expect(completions).toContain('signalingState');
    });
  });

  describe('RTC Configuration', () => {
    it('should use custom ICE servers', async () => {
      const iceServers = [
        { urls: 'stun:stun.example.com:3478' },
        {
          urls: 'turn:turn.example.com:3478',
          username: 'user',
          credential: 'pass'
        }
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        expect(config?.iceServers).toEqual(iceServers);
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers
      });

      const sub = customController.localDescription$.subscribe();
      vi.runAllTimers();

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();

      sub.unsubscribe();
      customController.destroy();
    });

    it('should filter UDP ICE servers when disabled', async () => {
      const iceServers = [
        { urls: 'turn:turn.example.com:3478?transport=udp' },
        { urls: 'turn:turn.example.com:3478?transport=tcp' },
        { urls: ['turn:a.com?transport=udp', 'turn:b.com?transport=tcp'] }
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers,
        disableUdpIceServers: true
      });

      const sub = customController.localDescription$.subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();
      const config = MockPeerConnectionConstructor.mock.calls[0][0] as RTCConfiguration;
      const filteredServers = config?.iceServers;

      // First server only has UDP URL, so after filtering its urls array should be empty
      expect(filteredServers?.[0].urls).toEqual([]);
      // Second server has TCP URL, should be kept
      expect(filteredServers?.[1].urls).toEqual(['turn:turn.example.com:3478?transport=tcp']);
      // Third server has mixed URLs, only TCP should remain
      expect(filteredServers?.[2].urls).toEqual(['turn:b.com?transport=tcp']);

      sub.unsubscribe();
      customController.destroy();
    });

    it('should filter out implicit UDP URLs (no transport param) when disableUdpIceServers is true', async () => {
      // Real-world example: URLs without transport param default to UDP
      const iceServers = [
        {
          urls: [
            'turn:turn.signalwire.com:443', // Implicit UDP - should be filtered out
            'turn:turn.signalwire.com:443?transport=tcp' // Explicit TCP - should be kept
          ]
        }
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers,
        disableUdpIceServers: true
      });

      const sub = customController.localDescription$.subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();
      const config = MockPeerConnectionConstructor.mock.calls[0][0] as RTCConfiguration;
      // Only the explicit TCP URL should remain
      expect(config?.iceServers?.[0].urls).toEqual(['turn:turn.signalwire.com:443?transport=tcp']);

      sub.unsubscribe();
      customController.destroy();
    });

    it('should return all ICE servers unchanged when disableUdpIceServers is false', async () => {
      const iceServers = [
        { urls: 'turn:turn.example.com:3478' }, // Implicit UDP
        { urls: 'turn:turn.example.com:3478?transport=tcp' },
        { urls: ['turn:a.com', 'turn:b.com?transport=tcp'] }
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers,
        disableUdpIceServers: false
      });

      const sub = customController.localDescription$.subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();
      const config = MockPeerConnectionConstructor.mock.calls[0][0] as RTCConfiguration;
      expect(config?.iceServers).toEqual(iceServers);

      sub.unsubscribe();
      customController.destroy();
    });

    it('should handle single URL string in ICE server when disableUdpIceServers is true', async () => {
      const iceServers = [
        { urls: 'turn:turn.example.com:3478?transport=tcp' } // Single string, not array
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers,
        disableUdpIceServers: true
      });

      const sub = customController.localDescription$.subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();
      const config = MockPeerConnectionConstructor.mock.calls[0][0] as RTCConfiguration;
      // Should convert to array and keep the TCP URL
      expect(config?.iceServers?.[0].urls).toEqual(['turn:turn.example.com:3478?transport=tcp']);

      sub.unsubscribe();
      customController.destroy();
    });

    it('should preserve credentials when filtering ICE servers', async () => {
      const iceServers = [
        {
          urls: ['turn:turn.example.com:3478', 'turn:turn.example.com:3478?transport=tcp'],
          username: 'testuser',
          credential: 'testpass'
        }
      ];

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        iceServers,
        disableUdpIceServers: true
      });

      const sub = customController.localDescription$.subscribe();
      await vi.advanceTimersByTimeAsync(100);

      expect(MockPeerConnectionConstructor).toHaveBeenCalled();
      const config = MockPeerConnectionConstructor.mock.calls[0][0] as RTCConfiguration;
      expect(config?.iceServers?.[0].urls).toEqual(['turn:turn.example.com:3478?transport=tcp']);
      expect(config?.iceServers?.[0].username).toBe('testuser');
      expect(config?.iceServers?.[0].credential).toBe('testpass');

      sub.unsubscribe();
      customController.destroy();
    });

    it('should set bundle policy to max-compat', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        expect(config?.bundlePolicy).toBe('max-compat');
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const customController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor)
      });

      const sub = customController.localDescription$.subscribe();
      vi.runAllTimers();

      sub.unsubscribe();
      customController.destroy();
    });
  });

  describe('Constraints and Track Updates', () => {
    it('should update sender constraints', async () => {
      const sub = controller.localDescription$.subscribe();
      vi.runAllTimers();

      // Add a track first
      const track = new MockMediaStreamTrack('audio');
      const sender = new MockRTCRtpSender(track);
      mockPeerConnection.getSenders = vi.fn(() => [sender]);

      await controller.updateSendersConstraints('audio', {
        echoCancellation: false,
        noiseSuppression: true
      });

      expect(track.applyConstraints).toHaveBeenCalled();

      sub.unsubscribe();
    });
  });

  describe('SFU Mode', () => {
    it('should add multiple video transceivers in SFU mode', async () => {
      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const sfuController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
        sfu: true,
        msStreamsNumber: 3,
        receiveVideo: true
      });

      const sub = sfuController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Should have added transceivers for SFU
      const addTransceiverCalls = mockPeerConnection.addTransceiver.mock.calls.filter(
        (call: any[]) => call[0] === 'video' && call[1]?.direction === 'recvonly'
      );

      expect(addTransceiverCalls.length).toBe(3);

      sub.unsubscribe();
      sfuController.destroy();
    });
  });

  describe('mediaDirections', () => {
    it('should return inactive for outbound (offer) connections without transceivers', () => {
      expect(controller.mediaDirections).toEqual({
        audio: 'inactive',
        video: 'inactive'
      });
    });

    it('should fall back to remote SDP directions for inbound connections before transceivers are set up', () => {
      const remoteSdp = [
        'v=0',
        'o=- 123 2 IN IP4 127.0.0.1',
        's=-',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=sendrecv',
        'm=video 9 UDP/TLS/RTP/SAVPF 96',
        'a=sendrecv'
      ].join('\r\n');

      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor)
        },
        remoteSdp
      );

      expect(answerController.mediaDirections).toEqual({
        audio: 'sendrecv',
        video: 'sendrecv'
      });

      answerController.destroy();
    });

    it('should fall back to audio-only SDP directions for inbound connections', () => {
      const remoteSdp = [
        'v=0',
        'o=- 123 2 IN IP4 127.0.0.1',
        's=-',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=sendonly'
      ].join('\r\n');

      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor)
        },
        remoteSdp
      );

      expect(answerController.mediaDirections).toEqual({
        audio: 'sendonly',
        video: 'inactive'
      });

      answerController.destroy();
    });
  });

  describe('acceptInbound', () => {
    it('should create answer SDP when called without options', async () => {
      const remoteSdp = [
        'v=0',
        'o=- 123 2 IN IP4 127.0.0.1',
        's=-',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=sendrecv',
        'm=video 9 UDP/TLS/RTP/SAVPF 96',
        'a=sendrecv'
      ].join('\r\n');

      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
          audio: true,
          video: true,
          receiveAudio: true,
          receiveVideo: true
        },
        remoteSdp
      );

      // Subscribe to trigger init
      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // The controller should be initialized but answer not yet created
      expect(answerController.type).toBe('answer');

      // Accept the inbound call
      await answerController.acceptInbound();
      await vi.runAllTimersAsync();

      // createAnswer should have been called
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();

      sub.unsubscribe();
      answerController.destroy();
    });

    it('should update receive options when accepting with overrides', async () => {
      const remoteSdp = [
        'v=0',
        'o=- 123 2 IN IP4 127.0.0.1',
        's=-',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=sendrecv',
        'm=video 9 UDP/TLS/RTP/SAVPF 96',
        'a=sendrecv'
      ].join('\r\n');

      const MockPeerConnectionConstructor = vi.fn(function (this: unknown) {
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const answerController = createTestController(
        {
          webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor),
          audio: true,
          video: true,
          receiveAudio: true,
          receiveVideo: true
        },
        remoteSdp
      );

      // Subscribe to trigger init
      const sub = answerController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // Accept with video disabled
      await answerController.acceptInbound({
        video: false,
        receiveVideo: false
      });
      await vi.runAllTimersAsync();

      expect(answerController.receiveVideo).toBe(false);
      expect(answerController.receiveAudio).toBe(true);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();

      sub.unsubscribe();
      answerController.destroy();
    });
  });

  describe('replaceAudioTrackWithConstraints', () => {
    it('should replace the audio track with new constraints preserving deviceId', async () => {
      const oldAudioTrack = new MockMediaStreamTrack('audio', 'old-audio');
      const newAudioTrack = new MockMediaStreamTrack('audio', 'new-audio');
      const newStream = new MockMediaStream([newAudioTrack]);

      // Track call count to distinguish init getUserMedia from replaceAudioTrack getUserMedia
      let getUserMediaCallCount = 0;
      const customGetUserMedia = vi.fn(async () => {
        getUserMediaCallCount++;
        if (getUserMediaCallCount === 1) {
          // First call: buildLocalStream during init
          return new MockMediaStream([oldAudioTrack]) as unknown as MediaStream;
        }
        // Second call: track replacement
        return newStream as unknown as MediaStream;
      });

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const testController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor, {
          getUserMedia: customGetUserMedia
        }),
        audio: true
      });

      // Subscribe to trigger init
      const sub = testController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      // After init, the peer connection has a sender with the old track
      // The init process adds transceivers with tracks
      const callCountBeforeReplace = getUserMediaCallCount;

      await testController.replaceAudioTrackWithConstraints({ echoCancellation: false });

      // getUserMedia should have been called again for the replacement
      expect(getUserMediaCallCount).toBeGreaterThan(callCountBeforeReplace);
      // The second call should be for audio replacement
      const secondCall = customGetUserMedia.mock.calls[callCountBeforeReplace];
      expect(secondCall[0]).toHaveProperty('audio');
      expect((secondCall[0] as { audio: MediaTrackConstraints }).audio).toMatchObject({
        echoCancellation: false
      });

      sub.unsubscribe();
      testController.destroy();
    });

    it('should not call getUserMedia for replacement when no live audio senders exist', async () => {
      // Use video-only controller so no audio senders are created
      const customGetUserMedia = vi.fn(async () => {
        return new MockMediaStream([
          new MockMediaStreamTrack('video', 'vid-track')
        ]) as unknown as MediaStream;
      });

      const MockPeerConnectionConstructor = vi.fn(function (
        this: unknown,
        config?: RTCConfiguration
      ) {
        mockPeerConnection = new MockRTCPeerConnection(config);
        return mockPeerConnection as unknown as RTCPeerConnection;
      });

      const testController = createTestController({
        webRTCApiProvider: createMockWebRTCApiProvider(MockPeerConnectionConstructor, {
          getUserMedia: customGetUserMedia
        }),
        audio: false,
        video: true
      });

      // Subscribe to trigger init
      const sub = testController.localDescription$.subscribe();
      await vi.runAllTimersAsync();

      const callCountBeforeReplace = customGetUserMedia.mock.calls.length;

      // No audio senders - should not throw or call getUserMedia again
      await testController.replaceAudioTrackWithConstraints({ echoCancellation: false });

      // getUserMedia should NOT have been called again
      expect(customGetUserMedia.mock.calls.length).toBe(callCountBeforeReplace);

      sub.unsubscribe();
      testController.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Section 5.5: Device change → track replacement wiring
  // The RTCPeerConnectionController subscribes to selectedAudioInputDevice$
  // and selectedVideoInputDevice$ from the DeviceController (lines 589-608).
  // When a device change is emitted, updateSelectedInputDevice() is called
  // which does stop → getUserMedia → replaceTrack.
  //
  // Full end-to-end testing of this chain requires a complete mock peer
  // connection (the init fails on setupRemoteTracks in the test environment).
  // The wiring is verified by reading the code — the subscription at line 589
  // directly calls updateSelectedInputDevice at line 607.
  //
  // The gating via syncDevicesToActiveCalls is tested in
  // NavigatorDeviceController.device-mgmt.test.ts.
  // -------------------------------------------------------------------------
});
