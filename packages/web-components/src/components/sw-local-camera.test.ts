import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { devicesContext, type DevicesState } from '../context/devices-context.js';

vi.mock('../utils/video.js', () => ({
  attachMediaStream: vi.fn(),
  detachMediaStream: vi.fn(),
  createVideoElement: vi.fn(),
  waitForVideoReady: vi.fn(),
}));

import * as videoUtils from '../utils/video.js';
const attachMediaStream = vi.mocked(videoUtils.attachMediaStream);
const detachMediaStream = vi.mocked(videoUtils.detachMediaStream);

const srcObjectStore = new WeakMap<HTMLMediaElement, MediaStream | null>();
Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
  get(this: HTMLMediaElement) { return srcObjectStore.get(this) ?? null; },
  set(this: HTMLMediaElement, value: MediaStream | null) { srcObjectStore.set(this, value); },
  configurable: true,
});

import './sw-local-camera.js';
import type { SwLocalCamera } from './sw-local-camera.js';

function makeStream(opts: { hasVideo?: boolean; width?: number; height?: number } = {}): MediaStream {
  const { hasVideo = true, width = 0, height = 0 } = opts;
  const tracks = hasVideo
    ? [{ kind: 'video', id: 'v1', getSettings: vi.fn(() => ({ width, height })) } as unknown as MediaStreamTrack]
    : [];
  return {
    id: `stream-${Math.random().toString(36).slice(2)}`,
    active: true,
    getTracks: () => [...tracks],
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => [],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaStream;
}

function makeCallState(overrides: Partial<CallState> = {}): CallState {
  return {
    id: 'call-1', direction: 'outbound', to: undefined, status: 'active' as any,
    recording: false, streaming: false, locked: false, raiseHandPriority: false,
    meta: {}, participants: [], self: null, remoteStream: null, localStream: null,
    mediaDirections: {} as any, layout: undefined, layouts: [], layoutLayers: [],
    address: undefined, capabilities: [],
    hangup: vi.fn(), toggleLock: vi.fn(), toggleHold: vi.fn(), setLayout: vi.fn(),
    startRecording: vi.fn(), startStreaming: vi.fn(), sendDigits: vi.fn(),
    answer: vi.fn(), reject: vi.fn(),
    ...overrides,
  };
}

function makeDevicesState(overrides: Partial<DevicesState> = {}): DevicesState {
  return {
    audioInputDevices: [], audioOutputDevices: [], videoInputDevices: [],
    selectedAudioInput: null, selectedAudioOutput: null, selectedVideoInput: null,
    audioMuted: false, videoMuted: false, speakerMuted: false,
    selectAudioInput: vi.fn(), selectAudioOutput: vi.fn(), selectVideoInput: vi.fn(),
    toggleAudioMute: vi.fn(), toggleVideoMute: vi.fn(), toggleSpeakerMute: vi.fn(),
    echoCancellation: false, autoGain: false, noiseSuppression: false,
    toggleEchoCancellation: vi.fn(), toggleAutoGain: vi.fn(), toggleNoiseSuppression: vi.fn(),
    ...overrides,
  };
}

async function mountDirect(props: Partial<SwLocalCamera> = {}): Promise<SwLocalCamera> {
  const el = document.createElement('sw-local-camera') as SwLocalCamera;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-local-camera-host')
class TestHost extends LitElement {
  callProvider!: ContextProvider<typeof callStateContext>;
  devicesProvider!: ContextProvider<typeof devicesContext>;
  connectedCallback() {
    super.connectedCallback();
    this.callProvider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
    this.devicesProvider = new ContextProvider(this, { context: devicesContext, initialValue: makeDevicesState() });
  }
  render() { return html`<sw-local-camera></sw-local-camera>`; }
}

async function mountWithContext(callState?: Partial<CallState>, devicesState?: Partial<DevicesState>) {
  const host = document.createElement('test-sw-local-camera-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.callProvider.setValue(makeCallState(callState));
  if (devicesState) host.devicesProvider.setValue(makeDevicesState(devicesState));
  await host.updateComplete;
  const camera = host.shadowRoot!.querySelector('sw-local-camera') as SwLocalCamera;
  await camera.updateComplete;
  return { host, camera };
}

describe('sw-local-camera', () => {
  let el: SwLocalCamera | null = null;
  let host: TestHost | null = null;

  beforeEach(() => { attachMediaStream.mockClear(); detachMediaStream.mockClear(); });
  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders a video element with autoplay, playsinline and muted attributes', async () => {
    el = await mountDirect();
    const video = el.shadowRoot!.querySelector('video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('does not render muted-overlay by default', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelector('.muted-overlay')).toBeNull();
  });

  it('renders muted-overlay when videoMuted prop is true', async () => {
    el = await mountDirect({ videoMuted: true });
    expect(el.shadowRoot!.querySelector('.muted-overlay')).toBeTruthy();
  });

  it('removes muted-overlay when videoMuted prop changes to false', async () => {
    el = await mountDirect({ videoMuted: true });
    el.videoMuted = false;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.muted-overlay')).toBeNull();
  });

  it('renders muted-overlay from devicesState.videoMuted via context', async () => {
    const result = await mountWithContext(undefined, { videoMuted: true });
    host = result.host;
    expect(result.camera.shadowRoot!.querySelector('.muted-overlay')).toBeTruthy();
  });

  it('videoMuted prop overrides devicesState.videoMuted', async () => {
    const result = await mountWithContext(undefined, { videoMuted: true });
    host = result.host;
    result.camera.videoMuted = false;
    await result.camera.updateComplete;
    expect(result.camera.shadowRoot!.querySelector('.muted-overlay')).toBeNull();
  });

  it('calls attachMediaStream with stream prop on mount', async () => {
    const stream = makeStream();
    el = await mountDirect({ stream });
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream);
  });

  it('calls attachMediaStream when stream prop changes', async () => {
    const stream1 = makeStream();
    const stream2 = makeStream();
    el = await mountDirect({ stream: stream1 });
    attachMediaStream.mockClear();
    el.stream = stream2;
    await el.updateComplete;
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream2);
  });

  it('subscribes to call.localStream$ and calls attachMediaStream', async () => {
    const stream = makeStream();
    const localStream$ = new BehaviorSubject<MediaStream | null>(stream);
    el = await mountDirect({ call: { localStream$, id: 'c1' } as any });
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream);
  });

  it('tears down old call subscriptions when call prop changes', async () => {
    const localStream1$ = new BehaviorSubject<MediaStream | null>(null);
    const localStream2$ = new BehaviorSubject<MediaStream | null>(null);
    el = await mountDirect({ call: { localStream$: localStream1$, id: 'c1' } as any });
    el.call = { localStream$: localStream2$, id: 'c2' } as any;
    await el.updateComplete;
    await el.updateComplete;
    attachMediaStream.mockClear();
    const oldStream = makeStream();
    localStream1$.next(oldStream);
    await el.updateComplete;
    expect(attachMediaStream).not.toHaveBeenCalledWith(expect.any(HTMLVideoElement), oldStream);
  });

  it('calls attachMediaStream with callState.localStream from context', async () => {
    const stream = makeStream();
    const result = await mountWithContext({ localStream: stream });
    host = result.host;
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream);
  });

  it('sets --sw-local-camera-aspect CSS property from track settings', async () => {
    const stream = makeStream({ width: 1920, height: 1080 });
    el = await mountDirect({ stream });
    expect(el.style.getPropertyValue('--sw-local-camera-aspect')).toBe('1920 / 1080');
  });

  it('calls detachMediaStream on disconnect', async () => {
    el = await mountDirect({ stream: makeStream() });
    detachMediaStream.mockClear();
    el.remove();
    expect(detachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement));
    el = null;
  });

  it('cleans up call subscriptions on disconnect', async () => {
    const localStream$ = new BehaviorSubject<MediaStream | null>(null);
    el = await mountDirect({ call: { localStream$, id: 'c1' } as any });
    el.remove();
    attachMediaStream.mockClear();
    localStream$.next(makeStream());
    expect(attachMediaStream).not.toHaveBeenCalled();
    el = null;
  });
});
