import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { devicesContext, type DevicesState } from '../context/devices-context.js';

import './sw-call-controls.js';
import type { SwCallControls } from './sw-call-controls.js';

function makeDevicesState(overrides: Partial<DevicesState> = {}): DevicesState {
  return {
    audioInputDevices: [], audioOutputDevices: [], videoInputDevices: [],
    selectedAudioInput: null, selectedAudioOutput: null, selectedVideoInput: null,
    audioMuted: false, videoMuted: false, speakerMuted: false,
    selectAudioInput: vi.fn(), selectAudioOutput: vi.fn(), selectVideoInput: vi.fn(),
    toggleAudioMute: vi.fn().mockResolvedValue(undefined),
    toggleVideoMute: vi.fn().mockResolvedValue(undefined),
    toggleSpeakerMute: vi.fn().mockResolvedValue(undefined),
    echoCancellation: false, autoGain: false, noiseSuppression: false,
    toggleEchoCancellation: vi.fn().mockResolvedValue(undefined),
    toggleAutoGain: vi.fn().mockResolvedValue(undefined),
    toggleNoiseSuppression: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeCallState(overrides: Partial<CallState> = {}): CallState {
  return {
    id: 'call-1', direction: 'outbound', to: undefined, status: 'active' as any,
    recording: false, streaming: false, locked: false, raiseHandPriority: false,
    meta: {}, participants: [], self: null, remoteStream: null, localStream: null,
    mediaDirections: {} as any, layout: undefined, layouts: [], layoutLayers: [],
    address: undefined, capabilities: [],
    hangup: vi.fn().mockResolvedValue(undefined),
    toggleLock: vi.fn(), toggleHold: vi.fn(), setLayout: vi.fn(),
    startRecording: vi.fn(), startStreaming: vi.fn(), sendDigits: vi.fn(),
    answer: vi.fn(), reject: vi.fn(),
    ...overrides,
  };
}

function makeCall(opts: { self?: any } = {}) {
  return {
    id: 'c1',
    self$: new BehaviorSubject<any>(opts.self ?? null),
    hangup: vi.fn().mockResolvedValue(undefined),
  };
}

@customElement('test-sw-call-controls-host')
class TestHost extends LitElement {
  callProvider!: ContextProvider<typeof callStateContext>;
  devicesProvider!: ContextProvider<typeof devicesContext>;
  connectedCallback() {
    super.connectedCallback();
    this.callProvider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
    this.devicesProvider = new ContextProvider(this, { context: devicesContext, initialValue: makeDevicesState() });
  }
  render() { return html`<sw-call-controls></sw-call-controls>`; }
}

async function mountWithContext(callState?: Partial<CallState>, devicesState?: Partial<DevicesState>) {
  const host = document.createElement('test-sw-call-controls-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.callProvider.setValue(makeCallState(callState));
  if (devicesState) host.devicesProvider.setValue(makeDevicesState(devicesState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-call-controls') as SwCallControls;
  await el.updateComplete;
  return { host, el };
}

async function mountDirect(props: Partial<SwCallControls> = {}): Promise<SwCallControls> {
  const el = document.createElement('sw-call-controls') as SwCallControls;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

function getControlBar(el: SwCallControls) {
  return el.shadowRoot!.querySelector('sw-ui-control-bar') as HTMLElement;
}

describe('sw-call-controls', () => {
  let el: SwCallControls | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders nothing when no devices context and no call prop', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelector('sw-ui-control-bar')).toBeNull();
  });

  it('renders sw-ui-control-bar when devices context is provided', async () => {
    const result = await mountWithContext();
    host = result.host;
    expect(getControlBar(result.el)).toBeTruthy();
  });

  it('calls toggleAudioMute when sw-mic-toggle fires', async () => {
    const devices = makeDevicesState();
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-mic-toggle', { bubbles: true }));
    expect(devices.toggleAudioMute).toHaveBeenCalled();
  });

  it('calls toggleVideoMute when sw-camera-toggle fires', async () => {
    const devices = makeDevicesState();
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-camera-toggle', { bubbles: true }));
    expect(devices.toggleVideoMute).toHaveBeenCalled();
  });

  it('calls toggleSpeakerMute when sw-speaker-toggle fires', async () => {
    const devices = makeDevicesState();
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-speaker-toggle', { bubbles: true }));
    expect(devices.toggleSpeakerMute).toHaveBeenCalled();
  });

  it('calls callState.hangup and dispatches sw-call-hangup on sw-call-hangup event', async () => {
    const callState = makeCallState();
    const result = await mountWithContext(callState);
    host = result.host;
    const fired: Event[] = [];
    result.el.addEventListener('sw-call-hangup', (e) => fired.push(e));
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-call-hangup', { bubbles: true }));
    await result.el.updateComplete;
    expect(callState.hangup).toHaveBeenCalled();
    expect(fired.length).toBe(1);
  });

  it('calls call.hangup and dispatches sw-call-hangup when call prop is set', async () => {
    const call = makeCall();
    const devices = makeDevicesState();
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    result.el.call = call as any;
    await result.el.updateComplete;
    const fired: Event[] = [];
    result.el.addEventListener('sw-call-hangup', (e) => fired.push(e));
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-call-hangup', { bubbles: true }));
    await result.el.updateComplete;
    expect(call.hangup).toHaveBeenCalled();
    expect(fired.length).toBe(1);
  });

  it('calls self.startScreenShare when sw-screen-share-toggle fires with active=true', async () => {
    const self = { startScreenShare: vi.fn().mockResolvedValue(undefined), stopScreenShare: vi.fn(), toggleHandraise: vi.fn(), screenShareStatus: 'none', handraised: false };
    const callState = makeCallState({ self: self as any });
    const result = await mountWithContext(callState);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-screen-share-toggle', { detail: { active: true }, bubbles: true }));
    await result.el.updateComplete;
    expect(self.startScreenShare).toHaveBeenCalled();
  });

  it('calls self.toggleHandraise when sw-hand-raise-toggle fires', async () => {
    const self = { toggleHandraise: vi.fn().mockResolvedValue(undefined), startScreenShare: vi.fn(), stopScreenShare: vi.fn(), screenShareStatus: 'none', handraised: false };
    const callState = makeCallState({ self: self as any });
    const result = await mountWithContext(callState);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-hand-raise-toggle', { detail: { raised: true }, bubbles: true }));
    await result.el.updateComplete;
    expect(self.toggleHandraise).toHaveBeenCalled();
  });

  it('calls selectAudioInput when sw-device-change fires for mic', async () => {
    const mic = { deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1' } as MediaDeviceInfo;
    const devices = makeDevicesState({ audioInputDevices: [mic] });
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-device-change', { detail: { kind: 'mic', deviceId: 'mic-1' }, bubbles: true }));
    expect(devices.selectAudioInput).toHaveBeenCalledWith(mic);
  });

  it('calls toggleEchoCancellation when sw-settings-change fires with echo-cancellation', async () => {
    const devices = makeDevicesState();
    const result = await mountWithContext(undefined, devices);
    host = result.host;
    getControlBar(result.el).dispatchEvent(new CustomEvent('sw-settings-change', { detail: { settingId: 'echo-cancellation' }, bubbles: true }));
    await result.el.updateComplete;
    expect(devices.toggleEchoCancellation).toHaveBeenCalled();
  });

  it('subscribes to call.self$ when call prop is set', async () => {
    const self = { screenShareStatus: 'started', handraised: true, startScreenShare: vi.fn(), stopScreenShare: vi.fn(), toggleHandraise: vi.fn() };
    const call = makeCall({ self });
    el = await mountDirect({ call: call as any });
    await el.updateComplete;
    expect((el as any)._directSelf).toBe(self);
  });

  it('cleans up subscriptions on disconnect', async () => {
    const call = makeCall();
    el = await mountDirect({ call: call as any });
    el.remove();
    expect(() => call.self$.next(null)).not.toThrow();
    el = null;
  });
});
