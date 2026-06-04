/**
 * Browser-only mock call fixtures.
 *
 * Requires a real browser environment (canvas.captureStream, AudioContext).
 * Use these in dev HTML pages, Playwright tests, or any context with a real DOM.
 *
 * For unit tests running under happy-dom / jsdom, use mock-call.ts instead.
 */

import { BehaviorSubject } from 'rxjs';
import type { CallSelfParticipant as SelfParticipant } from '@signalwire/js';
import type { Call } from '../../src/types/index.js';

// =============================================================================
// MEDIA STREAM FACTORIES
// =============================================================================

export interface FakeVideoStreamOptions {
  /** Label drawn on the canvas. Default: 'Fake Video' */
  label?: string;
  /** Base hue (0–360) for the colour-cycling background. Default: 200 */
  hue?: number;
  width?: number;
  height?: number;
  fps?: number;
}

/**
 * Canvas-based colour-cycling video stream.
 * The canvas animates continuously so the video element is never blank.
 */
export function createFakeVideoStream(options: FakeVideoStreamOptions = {}): MediaStream {
  const { label = 'Fake Video', hue = 200, width = 1280, height = 720, fps = 30 } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  let angle = 0;
  function draw() {
    angle = (angle + 0.5) % 360;
    const lightness = Math.round(30 + 20 * Math.sin((angle * Math.PI) / 180));
    ctx.fillStyle = `hsl(${hue}, 60%, ${lightness}%)`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `bold ${Math.round(width / 30)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, height / 2);
    requestAnimationFrame(draw);
  }
  draw();

  return canvas.captureStream(fps);
}

/**
 * Silent audio stream. Fulfils the MediaStream contract without making noise.
 */
export function createFakeAudioStream(): MediaStream {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const dest = ctx.createMediaStreamDestination();
  osc.frequency.value = 0;
  osc.connect(dest);
  osc.start();
  return dest.stream;
}

/**
 * Combined video + audio stream suitable for local or remote slots.
 */
export function createFakeMediaStream(videoOptions?: FakeVideoStreamOptions): MediaStream {
  const combined = new MediaStream();
  createFakeVideoStream(videoOptions).getTracks().forEach(t => combined.addTrack(t));
  createFakeAudioStream().getTracks().forEach(t => combined.addTrack(t));
  return combined;
}

// =============================================================================
// SELF PARTICIPANT MOCK
// =============================================================================

export interface MockSelfParticipantOverrides {
  id?: string;
  audioMuted?: boolean;
  videoMuted?: boolean;
  screenShareStatus?: string;
}

export interface MockSelfParticipant extends SelfParticipant {
  /** Underlying subjects — mutate these to simulate remote state changes. */
  _audioMuted$: BehaviorSubject<boolean>;
  _videoMuted$: BehaviorSubject<boolean>;
  _screenShareStatus$: BehaviorSubject<string>;
}

export function createMockSelfParticipant(
  overrides: MockSelfParticipantOverrides = {}
): MockSelfParticipant {
  const _audioMuted$ = new BehaviorSubject(overrides.audioMuted ?? false);
  const _videoMuted$ = new BehaviorSubject(overrides.videoMuted ?? false);
  const _screenShareStatus$ = new BehaviorSubject(overrides.screenShareStatus ?? 'inactive');

  return {
    id: overrides.id ?? 'mock-self',
    audioMuted$: _audioMuted$.asObservable(),
    videoMuted$: _videoMuted$.asObservable(),
    screenShareStatus$: _screenShareStatus$.asObservable(),
    mute: async () => { _audioMuted$.next(true); },
    unmute: async () => { _audioMuted$.next(false); },
    muteVideo: async () => { _videoMuted$.next(true); },
    unmuteVideo: async () => { _videoMuted$.next(false); },
    startScreenShare: async () => { _screenShareStatus$.next('active'); },
    stopScreenShare: async () => { _screenShareStatus$.next('inactive'); },
    // Expose subjects so callers can push state from the outside
    _audioMuted$,
    _videoMuted$,
    _screenShareStatus$,
  };
}

// =============================================================================
// CALL MOCK
// =============================================================================

export interface MockCallOverrides {
  id?: string;
  status?: import('@signalwire/js').CallStatus;
  selfParticipant?: MockSelfParticipant;
  remoteStream?: MediaStream;
  localStream?: MediaStream;
  onHangup?: () => void;
}

export interface MockCall extends Call {
  /** Underlying subjects — push values to simulate live state changes. */
  _status$: BehaviorSubject<import('@signalwire/js').CallStatus>;
  _self$: BehaviorSubject<MockSelfParticipant>;
  _remoteStream$: BehaviorSubject<MediaStream | null>;
  _localStream$: BehaviorSubject<MediaStream | null>;
}

/**
 * Full browser-compatible mock call wired with real MediaStreams.
 *
 * @example
 * const call = createMockBrowserCall();
 * callMediaEl.call = call;
 * callControlsEl.call = call;
 *
 * // Simulate remote state change:
 * call._status$.next('disconnected');
 */
export function createMockBrowserCall(overrides: MockCallOverrides = {}): MockCall {
  const self = overrides.selfParticipant ?? createMockSelfParticipant();

  const _status$ = new BehaviorSubject<import('@signalwire/js').CallStatus>(
    overrides.status ?? 'connected'
  );
  const _self$ = new BehaviorSubject<MockSelfParticipant>(self);
  const _remoteStream$ = new BehaviorSubject<MediaStream | null>(
    overrides.remoteStream ?? null
  );
  const _localStream$ = new BehaviorSubject<MediaStream | null>(
    overrides.localStream ?? null
  );
  const _layoutLayers$ = new BehaviorSubject<import('@signalwire/js').LayoutLayer[]>([]);
  const _capabilities$ = new BehaviorSubject<string[]>([]);
  const _recording$ = new BehaviorSubject<boolean>(false);
  const _streaming$ = new BehaviorSubject<boolean>(false);
  const _locked$ = new BehaviorSubject<boolean>(false);
  const _raiseHandPriority$ = new BehaviorSubject<boolean>(false);
  const _meta$ = new BehaviorSubject<Record<string, unknown>>({});
  const _participants$ = new BehaviorSubject<import('@signalwire/js').CallParticipant[]>([]);
  const _mediaDirections$ = new BehaviorSubject<{ audio: string; video: string }>({ audio: 'sendrecv', video: 'sendrecv' });
  const _layout$ = new BehaviorSubject<string | undefined>(undefined);
  const _layouts$ = new BehaviorSubject<string[]>([]);
  const _address$ = new BehaviorSubject<import('@signalwire/js').CallAddress | undefined>(undefined);

  return {
    id: overrides.id ?? 'mock-call',
    direction: 'outbound',
    self,
    self$: _self$.asObservable(),
    status$: _status$.asObservable(),
    get status() { return _status$.value; },
    capabilities$: _capabilities$.asObservable(),
    get capabilities() { return _capabilities$.value; },
    remoteStream$: _remoteStream$.asObservable(),
    get remoteStream() { return _remoteStream$.value; },
    localStream$: _localStream$.asObservable(),
    get localStream() { return _localStream$.value; },
    layoutLayers$: _layoutLayers$.asObservable(),
    get layoutLayers() { return _layoutLayers$.value; },
    recording$: _recording$.asObservable(),
    get recording() { return _recording$.value; },
    streaming$: _streaming$.asObservable(),
    get streaming() { return _streaming$.value; },
    locked$: _locked$.asObservable(),
    get locked() { return _locked$.value; },
    raiseHandPriority$: _raiseHandPriority$.asObservable(),
    get raiseHandPriority() { return _raiseHandPriority$.value; },
    meta$: _meta$.asObservable(),
    get meta() { return _meta$.value; },
    participants$: _participants$.asObservable(),
    get participants() { return _participants$.value; },
    mediaDirections$: _mediaDirections$.asObservable(),
    get mediaDirections() { return _mediaDirections$.value; },
    layout$: _layout$.asObservable(),
    get layout() { return _layout$.value; },
    layouts$: _layouts$.asObservable(),
    get layouts() { return _layouts$.value; },
    address$: _address$.asObservable(),
    get address() { return _address$.value; },
    hangup: async () => {
      _status$.next('disconnected');
      overrides.onHangup?.();
    },
    _status$,
    _self$,
    _remoteStream$,
    _localStream$,
  } as unknown as MockCall;
}
