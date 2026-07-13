import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { LayoutLayer } from '../types/index.js';

const srcObjectStore = new WeakMap<HTMLMediaElement, MediaStream | null>();
Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
  get(this: HTMLMediaElement) { return srcObjectStore.get(this) ?? null; },
  set(this: HTMLMediaElement, value: MediaStream | null) { srcObjectStore.set(this, value); },
  configurable: true,
});

import './sw-self-media.js';
import type { SwSelfMedia } from './sw-self-media.js';

function makeStream(hasVideo = true): MediaStream {
  const tracks = hasVideo ? [{ kind: 'video', id: 'v1' } as unknown as MediaStreamTrack] : [];
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

function makeLayer(overrides: Partial<LayoutLayer> = {}): LayoutLayer {
  return { member_id: 'self-1', x: 10, y: 20, width: 30, height: 40, visible: true, ...overrides } as unknown as LayoutLayer;
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

function makeCall(opts: { self?: any; layoutLayers?: LayoutLayer[]; localStream?: MediaStream | null } = {}) {
  return {
    id: 'c1',
    self$: new BehaviorSubject<any>(opts.self ?? null),
    layoutLayers$: new BehaviorSubject<LayoutLayer[]>(opts.layoutLayers ?? []),
    localStream$: new BehaviorSubject<MediaStream | null>(opts.localStream ?? null),
  };
}

async function mountDirect(props: Partial<SwSelfMedia> = {}): Promise<SwSelfMedia> {
  const el = document.createElement('sw-self-media') as SwSelfMedia;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-self-media-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-self-media></sw-self-media>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-self-media-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const media = host.shadowRoot!.querySelector('sw-self-media') as SwSelfMedia;
  await media.updateComplete;
  return { host, media };
}

describe('sw-self-media', () => {
  let el: SwSelfMedia | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders nothing when no self layer is found', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelector('.local-overlay')).toBeNull();
  });

  it('renders nothing when layer exists but stream has no video tracks', async () => {
    const call = makeCall({
      self: { id: 'self-1' },
      layoutLayers: [makeLayer()],
      localStream: makeStream(false),
    });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelector('.local-overlay')).toBeNull();
  });

  it('renders video element when layer and video stream are present', async () => {
    const call = makeCall({
      self: { id: 'self-1' },
      layoutLayers: [makeLayer()],
      localStream: makeStream(),
    });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelector('video.local-video')).toBeTruthy();
  });

  it('sets srcObject on the video element from local stream', async () => {
    const stream = makeStream();
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: stream });
    el = await mountDirect({ call: call as any });
    const video = el.shadowRoot!.querySelector('video') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
  });

  it('video has autoplay, playsinline and muted attributes', async () => {
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: makeStream() });
    el = await mountDirect({ call: call as any });
    const video = el.shadowRoot!.querySelector('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('applies mirror transform when mirror prop is true', async () => {
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: makeStream() });
    el = await mountDirect({ call: call as any, mirror: true });
    const video = el.shadowRoot!.querySelector('video') as HTMLVideoElement;
    expect(video.style.transform).toContain('scale(-1, 1)');
  });

  it('does not apply mirror transform when mirror prop is false', async () => {
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: makeStream() });
    el = await mountDirect({ call: call as any, mirror: false });
    const video = el.shadowRoot!.querySelector('video') as HTMLVideoElement;
    expect(video.style.transform).toBe('');
  });

  it('positions the overlay using layer coordinates', async () => {
    const layer = makeLayer({ x: 5, y: 15, width: 25, height: 35 });
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [layer], localStream: makeStream() });
    el = await mountDirect({ call: call as any });
    const overlay = el.shadowRoot!.querySelector('.local-overlay') as HTMLElement;
    expect(overlay.style.left).toBe('5%');
    expect(overlay.style.top).toBe('15%');
    expect(overlay.style.width).toBe('25%');
    expect(overlay.style.height).toBe('35%');
  });

  it('sets opacity to 0 when layer is not visible', async () => {
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer({ visible: false })], localStream: makeStream() });
    el = await mountDirect({ call: call as any });
    const overlay = el.shadowRoot!.querySelector('.local-overlay') as HTMLElement;
    expect(overlay.style.opacity).toBe('0');
  });

  it('renders from context when no call prop is set', async () => {
    const result = await mountWithContext({
      self: { id: 'self-1' } as any,
      layoutLayers: [makeLayer()],
      localStream: makeStream(),
    });
    host = result.host;
    await result.media.updateComplete;
    expect(result.media.shadowRoot!.querySelector('video.local-video')).toBeTruthy();
  });

  it('updates when context provides a matching layer', async () => {
    const stream = makeStream();
    const result = await mountWithContext({ localStream: stream });
    host = result.host;
    expect(result.media.shadowRoot!.querySelector('video')).toBeNull();
    host.provider.setValue(makeCallState({
      self: { id: 'self-1' } as any,
      layoutLayers: [makeLayer()],
      localStream: stream,
    }));
    await result.media.updateComplete;
    expect(result.media.shadowRoot!.querySelector('video.local-video')).toBeTruthy();
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: makeStream() });
    const call2 = makeCall();
    el = await mountDirect({ call: call1 as any });
    expect(el.shadowRoot!.querySelector('.local-overlay')).toBeTruthy();
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.local-overlay')).toBeNull();
  });

  it('cleans up subscriptions on disconnect without errors', async () => {
    const call = makeCall({ self: { id: 'self-1' }, layoutLayers: [makeLayer()], localStream: makeStream() });
    el = await mountDirect({ call: call as any });
    el.remove();
    expect(() => call.localStream$.next(makeStream())).not.toThrow();
    el = null;
  });
});
