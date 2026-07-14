/* eslint-disable @typescript-eslint/require-await -- mocks implement async
   WebRTC interfaces without real asynchronous work */
/**
 * Shared WebRTC mocks for unit tests.
 *
 * Plain classes (no vitest spies) so this module has no test-framework
 * dependency — tests that need call assertions can wrap methods with
 * `vi.spyOn`/`vi.fn` locally. Excluded from coverage via vitest.config.ts.
 */

let idCounter = 0;
const nextId = (prefix: string): string => `${prefix}-${++idCounter}`;

export class MockMediaStreamTrack {
  id: string;
  kind: 'audio' | 'video';
  enabled = true;
  readyState: 'live' | 'ended' = 'live';

  constructor(kind: 'audio' | 'video') {
    this.kind = kind;
    this.id = nextId(`${kind}-track`);
  }

  stop(): void {
    this.readyState = 'ended';
  }
  getConstraints(): MediaTrackConstraints {
    return {};
  }
  getSettings(): MediaTrackSettings {
    return {};
  }
  async applyConstraints(): Promise<void> {
    /* no-op */
  }
  addEventListener(): void {
    /* no-op */
  }
  removeEventListener(): void {
    /* no-op */
  }
}

export class MockMediaStream {
  id = nextId('stream');
  active = true;
  private tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.tracks = tracks;
  }

  getAudioTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio');
  }
  getVideoTracks(): MockMediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video');
  }
  getTracks(): MockMediaStreamTrack[] {
    return [...this.tracks];
  }
  addTrack(track: MockMediaStreamTrack): void {
    this.tracks.push(track);
  }
  removeTrack(track: MockMediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t.id !== track.id);
  }
}

export class MockRTCRtpSender {
  track: MockMediaStreamTrack | null;

  constructor(track?: MockMediaStreamTrack) {
    this.track = track ?? null;
  }

  async replaceTrack(track: MockMediaStreamTrack | null): Promise<void> {
    this.track = track;
  }
  setStreams(): void {
    /* no-op */
  }
  getParameters(): RTCRtpSendParameters {
    return { transactionId: '', encodings: [], headerExtensions: [], rtcp: {}, codecs: [] };
  }
  async setParameters(): Promise<void> {
    /* no-op */
  }
}

export class MockRTCRtpTransceiver {
  mid: string | null;
  sender = new MockRTCRtpSender();
  receiver: { track: MockMediaStreamTrack };
  direction: RTCRtpTransceiverDirection = 'sendrecv';
  currentDirection: RTCRtpTransceiverDirection | null = null;

  constructor(kind: 'audio' | 'video') {
    this.mid = nextId(`${kind}-mid`);
    this.receiver = { track: new MockMediaStreamTrack(kind) };
  }

  stop(): void {
    /* no-op */
  }
  setCodecPreferences(): void {
    /* no-op */
  }
}

/**
 * Minimal RTCPeerConnection mock covering the controller's offer flow:
 * event listeners, offer/answer creation, ICE-gathering simulation on
 * setLocalDescription, transceiver/track registration (dispatching
 * `negotiationneeded`), and helpers to simulate state changes.
 */
export class MockRTCPeerConnection {
  iceConnectionState: RTCIceConnectionState = 'new';
  connectionState: RTCPeerConnectionState = 'new';
  signalingState: RTCSignalingState = 'stable';
  iceGatheringState: RTCIceGatheringState = 'new';
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;

  private transceivers: MockRTCRtpTransceiver[] = [];
  private senders: MockRTCRtpSender[] = [];
  private configuration: RTCConfiguration;
  private eventListeners = new Map<string, Set<EventListener>>();

  constructor(configuration?: RTCConfiguration) {
    this.configuration = configuration ?? {};
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.eventListeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  hasListener(type: string): boolean {
    return (this.eventListeners.get(type)?.size ?? 0) > 0;
  }

  private dispatch(type: string, event: Event | RTCPeerConnectionIceEvent): void {
    this.eventListeners.get(type)?.forEach((listener) => listener(event as Event));
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'offer',
      sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:video\r\n'
    };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'v=0\r\n' };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description;
    this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable';
    this.dispatch('signalingstatechange', new Event('signalingstatechange'));

    this.iceGatheringState = 'gathering';
    this.dispatch('icegatheringstatechange', new Event('icegatheringstatechange'));

    void Promise.resolve().then(() => this.simulateICEGathering());
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description;
  }

  addTransceiver(
    trackOrKind: MockMediaStreamTrack | string,
    init?: RTCRtpTransceiverInit
  ): MockRTCRtpTransceiver {
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
    void Promise.resolve().then(() => {
      this.dispatch('negotiationneeded', new Event('negotiationneeded'));
    });
    return transceiver;
  }

  addTrack(track: MockMediaStreamTrack): MockRTCRtpSender {
    const sender = new MockRTCRtpSender(track);
    this.senders.push(sender);
    void Promise.resolve().then(() => {
      this.dispatch('negotiationneeded', new Event('negotiationneeded'));
    });
    return sender;
  }

  removeTrack(): void {
    /* no-op */
  }
  getTransceivers(): MockRTCRtpTransceiver[] {
    return [...this.transceivers];
  }
  getSenders(): MockRTCRtpSender[] {
    return [...this.senders];
  }
  getReceivers(): { track: MockMediaStreamTrack }[] {
    return this.transceivers.map((t) => t.receiver);
  }
  getConfiguration(): RTCConfiguration {
    return this.configuration;
  }
  setConfiguration(config: RTCConfiguration): void {
    this.configuration = config;
  }
  async getStats(): Promise<Map<string, unknown>> {
    return new Map<string, unknown>();
  }
  restartIce(): void {
    /* no-op */
  }

  close(): void {
    this.connectionState = 'closed';
    this.signalingState = 'closed';
  }

  simulateICEGathering(): void {
    this.dispatch('icecandidate', {
      candidate: {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host generation 0',
        sdpMid: 'video',
        sdpMLineIndex: 0,
        toJSON: () => ({})
      }
    } as unknown as RTCPeerConnectionIceEvent);

    this.iceGatheringState = 'complete';
    this.dispatch('icegatheringstatechange', new Event('icegatheringstatechange'));
    this.dispatch('icecandidate', { candidate: null } as unknown as RTCPeerConnectionIceEvent);
  }

  simulateConnectionStateChange(state: RTCPeerConnectionState): void {
    this.connectionState = state;
    this.dispatch('connectionstatechange', new Event('connectionstatechange'));
  }
}
