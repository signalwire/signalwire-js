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

import './sw-call-media.js';
import type { SwCallMedia } from './sw-call-media.js';

function makeStream(): MediaStream & { _tracks: MediaStreamTrack[] } {
  const tracks: MediaStreamTrack[] = [];
  const makeTrack = (kind: 'audio' | 'video') =>
    ({ kind, id: `${kind}-${Math.random().toString(36).slice(2)}` }) as MediaStreamTrack;
  tracks.push(makeTrack('video'));
  return {
    id: `stream-${Math.random().toString(36).slice(2)}`,
    active: true,
    getTracks: () => [...tracks],
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    addTrack: vi.fn((t) => tracks.push(t)),
    removeTrack: vi.fn(),
    clone: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
    onaddtrack: null,
    onremovetrack: null,
    _tracks: tracks,
  } as unknown as MediaStream & { _tracks: MediaStreamTrack[] };
}

function makeCallState(overrides: Partial<CallState> = {}): CallState {
  return {
    id: 'call-1', direction: 'outbound', to: undefined, status: 'active' as any,
    recording: false, streaming: false, locked: false, raiseHandPriority: false,
    meta: {}, participants: [], self: null, remoteStream: null, localStream: null,
    mediaDirections: { audio: 'inactive', video: 'inactive' } as any,
    layout: undefined, layouts: [], layoutLayers: [], address: undefined, capabilities: [],
    hangup: vi.fn(), toggleLock: vi.fn(), toggleHold: vi.fn(), setLayout: vi.fn(),
    startRecording: vi.fn(), startStreaming: vi.fn(), sendDigits: vi.fn(),
    answer: vi.fn(), reject: vi.fn(),
    ...overrides,
  };
}

function makeDevicesState(overrides: Partial<DevicesState> = {}): DevicesState {
  return {
    audioInputs: [], audioOutputs: [], videoInputs: [],
    selectedAudioInput: null, selectedAudioOutput: null, selectedVideoInput: null,
    ...overrides,
  } as DevicesState;
}

async function mountDirect(props: Partial<SwCallMedia> = {}): Promise<SwCallMedia> {
  const el = document.createElement('sw-call-media') as SwCallMedia;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

@customElement('test-sw-call-media-host')
class TestHost extends LitElement {
  callProvider!: ContextProvider<typeof callStateContext>;
  devicesProvider!: ContextProvider<typeof devicesContext>;
  connectedCallback() {
    super.connectedCallback();
    this.callProvider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
    this.devicesProvider = new ContextProvider(this, { context: devicesContext, initialValue: makeDevicesState() });
  }
  render() { return html`<sw-call-media></sw-call-media>`; }
}

async function mountWithContext(callState?: Partial<CallState>, devicesState?: Partial<DevicesState>) {
  const host = document.createElement('test-sw-call-media-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.callProvider.setValue(makeCallState(callState));
  if (devicesState) host.devicesProvider.setValue(makeDevicesState(devicesState));
  await host.updateComplete;
  const media = host.shadowRoot!.querySelector('sw-call-media') as SwCallMedia;
  await media.updateComplete;
  return { host, media };
}

describe('sw-call-media', () => {
  let el: SwCallMedia | null = null;
  let host: TestHost | null = null;

  beforeEach(() => { attachMediaStream.mockClear(); detachMediaStream.mockClear(); });
  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders a video element with correct attributes', async () => {
    el = await mountDirect();
    const video = el.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('binds stream prop to video srcObject on mount', async () => {
    const stream = makeStream();
    el = await mountDirect({ stream });
    const video = el.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
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

  it('calls attachMediaStream with null when stream prop cleared', async () => {
    const stream = makeStream();
    el = await mountDirect({ stream });
    attachMediaStream.mockClear();
    el.stream = null;
    await el.updateComplete;
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), null);
  });

  it('subscribes to call.remoteStream$ and sets srcObject', async () => {
    const stream = makeStream();
    const remoteStream$ = new BehaviorSubject<MediaStream | null>(stream);
    el = await mountDirect({ call: { remoteStream$, id: 'c1' } as any });
    await el.updateComplete;
    const video = el.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
  });

  it('unsubscribes old call when call prop changes', async () => {
    const remoteStream1$ = new BehaviorSubject<MediaStream | null>(null);
    const remoteStream2$ = new BehaviorSubject<MediaStream | null>(null);
    el = await mountDirect({ call: { remoteStream$: remoteStream1$, id: 'c1' } as any });
    el.call = { remoteStream$: remoteStream2$, id: 'c2' } as any;
    await el.updateComplete;
    attachMediaStream.mockClear();
    const oldStream = makeStream();
    remoteStream1$.next(oldStream);
    await el.updateComplete;
    expect(attachMediaStream).not.toHaveBeenCalledWith(expect.any(HTMLVideoElement), oldStream);
  });

  it('does not re-attach when same stream reference and track signature re-emitted', async () => {
    const stream = makeStream();
    const remoteStream$ = new BehaviorSubject<MediaStream | null>(stream);
    el = await mountDirect({ call: { remoteStream$, id: 'c1' } as any });
    await el.updateComplete;
    attachMediaStream.mockClear();
    remoteStream$.next(stream);
    await el.updateComplete;
    expect(attachMediaStream).not.toHaveBeenCalled();
  });

  it('re-attaches when a track is added to the same stream reference', async () => {
    const stream = makeStream();
    const remoteStream$ = new BehaviorSubject<MediaStream | null>(stream);
    el = await mountDirect({ call: { remoteStream$, id: 'c1' } as any });
    await el.updateComplete;
    stream._tracks.push({ kind: 'audio', id: 'audio-new' } as MediaStreamTrack);
    remoteStream$.next(stream);
    await el.updateComplete;
    const video = el.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
  });

  it('calls attachMediaStream with context remoteStream', async () => {
    const stream = makeStream();
    ({ host } = await mountWithContext({ remoteStream: stream }));
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream);
  });

  it('calls attachMediaStream when context remoteStream changes', async () => {
    const stream1 = makeStream();
    const result = await mountWithContext({ remoteStream: stream1 });
    host = result.host;
    attachMediaStream.mockClear();
    const stream2 = makeStream();
    host.callProvider.setValue(makeCallState({ remoteStream: stream2 }));
    await result.media.updateComplete;
    expect(attachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement), stream2);
  });

  it('calls setSinkId when selectedAudioOutput changes', async () => {
    const result = await mountWithContext();
    host = result.host;
    const video = result.media.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    const setSinkId = vi.fn().mockResolvedValue(undefined);
    (video as any).setSinkId = setSinkId;
    host.devicesProvider.setValue(makeDevicesState({ selectedAudioOutput: { deviceId: 'out-1' } as MediaDeviceInfo }));
    await result.media.updateComplete;
    expect(setSinkId).toHaveBeenCalledWith('out-1');
  });

  it('does not throw when setSinkId is not supported', async () => {
    const result = await mountWithContext();
    host = result.host;
    const video = result.media.shadowRoot!.querySelector('video.mcu-video') as HTMLVideoElement;
    delete (video as any).setSinkId;
    expect(() => {
      host!.devicesProvider.setValue(makeDevicesState({ selectedAudioOutput: { deviceId: 'x' } as MediaDeviceInfo }));
    }).not.toThrow();
  });

  it('calls detachMediaStream on disconnect', async () => {
    el = await mountDirect({ stream: makeStream() });
    detachMediaStream.mockClear();
    el.remove();
    expect(detachMediaStream).toHaveBeenCalledWith(expect.any(HTMLVideoElement));
    el = null;
  });

  it('cleans up call subscriptions on disconnect', async () => {
    const remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
    el = await mountDirect({ call: { remoteStream$, id: 'c1' } as any });
    el.remove();
    attachMediaStream.mockClear();
    remoteStream$.next(makeStream());
    expect(attachMediaStream).not.toHaveBeenCalled();
    el = null;
  });
});
