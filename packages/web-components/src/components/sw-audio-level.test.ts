import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';

import './sw-audio-level.js';
import type { SwAudioLevel } from './sw-audio-level.js';

function makeAudioTrack() {
  return { kind: 'audio', id: 'a1', stop: vi.fn() } as unknown as MediaStreamTrack;
}

function makeStream(hasAudio = true): MediaStream {
  const tracks = hasAudio ? [makeAudioTrack()] : [];
  return {
    id: 'stream-1', active: true,
    getAudioTracks: () => [...tracks],
    getVideoTracks: () => [],
    getTracks: () => [...tracks],
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
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

function makeCall(localStream: MediaStream | null = null) {
  return { id: 'c1', localStream$: new BehaviorSubject<MediaStream | null>(localStream) };
}

let mockAudioContext: any;

beforeEach(() => {
  mockAudioContext = {
    state: 'running',
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 32,
      getByteFrequencyData: vi.fn(), disconnect: vi.fn(), connect: vi.fn(),
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() }),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockAudioContext));
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

async function mountDirect(props: Partial<SwAudioLevel> = {}): Promise<SwAudioLevel> {
  const el = document.createElement('sw-audio-level') as SwAudioLevel;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-audio-level-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-audio-level></sw-audio-level>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-audio-level-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-audio-level') as SwAudioLevel;
  await el.updateComplete;
  return { host, el };
}

describe('sw-audio-level', () => {
  let el: SwAudioLevel | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; vi.unstubAllGlobals(); });

  it('renders a container with correct ARIA attributes', async () => {
    el = await mountDirect();
    const container = el.shadowRoot!.querySelector('.container')!;
    expect(container).toBeTruthy();
    expect(container.getAttribute('role')).toBe('meter');
    expect(container.getAttribute('aria-valuemin')).toBe('0');
    expect(container.getAttribute('aria-valuemax')).toBe('100');
  });

  it('renders 5 bars by default', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(5);
  });

  it('renders correct number of bars when bars prop changes', async () => {
    el = await mountDirect({ bars: 8 });
    expect(el.shadowRoot!.querySelectorAll('.bar').length).toBe(8);
  });

  it('reflects orientation attribute on host', async () => {
    el = await mountDirect({ orientation: 'horizontal' });
    expect(el.getAttribute('orientation')).toBe('horizontal');
  });

  it('sets up audio analysis when stream prop is set', async () => {
    const stream = makeStream();
    el = await mountDirect({ stream });
    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(stream);
  });

  it('does not create AudioContext when stream has no audio tracks', async () => {
    el = await mountDirect({ stream: makeStream(false) });
    expect(mockAudioContext.createAnalyser).not.toHaveBeenCalled();
  });

  it('cleans up and re-creates audio analysis when stream prop changes', async () => {
    const stream1 = makeStream();
    const stream2 = makeStream();
    el = await mountDirect({ stream: stream1 });
    const closeCalls = mockAudioContext.close.mock.calls.length;
    el.stream = stream2;
    await el.updateComplete;
    expect(mockAudioContext.close.mock.calls.length).toBeGreaterThan(closeCalls);
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(stream2);
  });

  it('subscribes to call.localStream$ and sets up analysis', async () => {
    const stream = makeStream();
    const call = makeCall(stream);
    el = await mountDirect({ call: call as any });
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(stream);
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall(makeStream());
    const call2 = makeCall();
    el = await mountDirect({ call: call1 as any });
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    const prevCloseCalls = mockAudioContext.close.mock.calls.length;
    call1.localStream$.next(makeStream());
    await el.updateComplete;
    expect(mockAudioContext.close.mock.calls.length).toBe(prevCloseCalls);
  });

  it('sets up analysis from context localStream', async () => {
    const stream = makeStream();
    const result = await mountWithContext({ localStream: stream });
    host = result.host;
    expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(stream);
  });

  it('releaseResources() closes AudioContext', async () => {
    el = await mountDirect({ stream: makeStream() });
    el.releaseResources();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('cleans up AudioContext on disconnect', async () => {
    el = await mountDirect({ stream: makeStream() });
    el.remove();
    expect(mockAudioContext.close).toHaveBeenCalled();
    el = null;
  });

  it('calls getUserMedia when autoRequest=true and no stream', async () => {
    const getUserMediaMock = vi.fn().mockResolvedValue(makeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: getUserMediaMock }, configurable: true,
    });
    el = await mountDirect({ autoRequest: true });
    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true });
  });
});
