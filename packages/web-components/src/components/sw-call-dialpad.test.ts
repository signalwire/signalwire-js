import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';

import './sw-call-dialpad.js';
import type { SwCallDialpad } from './sw-call-dialpad.js';

function makeCallState(overrides: Partial<CallState> = {}): CallState {
  return {
    id: 'call-1', direction: 'outbound', to: undefined, status: 'new' as any,
    recording: false, streaming: false, locked: false, raiseHandPriority: false,
    meta: {}, participants: [], self: null, remoteStream: null, localStream: null,
    mediaDirections: {} as any, layout: undefined, layouts: [], layoutLayers: [],
    address: undefined, capabilities: [],
    hangup: vi.fn(), toggleLock: vi.fn(), toggleHold: vi.fn(), setLayout: vi.fn(),
    startRecording: vi.fn(), startStreaming: vi.fn(),
    sendDigits: vi.fn().mockResolvedValue(undefined),
    answer: vi.fn(), reject: vi.fn(),
    ...overrides,
  };
}

function makeCall(status = 'new') {
  return {
    id: 'c1',
    status$: new BehaviorSubject<any>(status),
    sendDigits: vi.fn().mockResolvedValue(undefined),
  };
}

async function mountDirect(props: Partial<SwCallDialpad> = {}): Promise<SwCallDialpad> {
  const el = document.createElement('sw-call-dialpad') as SwCallDialpad;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-call-dialpad-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-call-dialpad></sw-call-dialpad>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-call-dialpad-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-call-dialpad') as SwCallDialpad;
  await el.updateComplete;
  return { host, el };
}

function getDialpad(el: SwCallDialpad) {
  return el.shadowRoot!.querySelector('sw-ui-dialpad') as HTMLElement;
}

function fireDigitPress(el: SwCallDialpad, digit: string) {
  getDialpad(el).dispatchEvent(
    new CustomEvent('sw-digit-press', { detail: { digit, digits: digit }, bubbles: true })
  );
}

describe('sw-call-dialpad', () => {
  let el: SwCallDialpad | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders sw-ui-dialpad', async () => {
    el = await mountDirect();
    expect(getDialpad(el)).toBeTruthy();
  });

  it('passes show-call-button attribute to sw-ui-dialpad', async () => {
    el = await mountDirect({ showCallButton: true });
    expect(getDialpad(el).hasAttribute('show-call-button')).toBe(true);
  });

  it('passes allow-text attribute to sw-ui-dialpad', async () => {
    el = await mountDirect({ allowText: true });
    expect(getDialpad(el).hasAttribute('allow-text')).toBe(true);
  });

  it('passes placeholder to sw-ui-dialpad', async () => {
    el = await mountDirect({ placeholder: 'Dial SIP URI' });
    expect(getDialpad(el).getAttribute('placeholder')).toBe('Dial SIP URI');
  });

  it('calls call.sendDigits when call is connected and digit is pressed', async () => {
    const call = makeCall('connected');
    el = await mountDirect({ call: call as any });
    fireDigitPress(el, '5');
    expect(call.sendDigits).toHaveBeenCalledWith('5');
  });

  it('does not call sendDigits when call status is not connected', async () => {
    const call = makeCall('connecting');
    el = await mountDirect({ call: call as any });
    fireDigitPress(el, '5');
    expect(call.sendDigits).not.toHaveBeenCalled();
  });

  it('calls callState.sendDigits when context status is connected', async () => {
    const callState = makeCallState({ status: 'connected' as any });
    const result = await mountWithContext(callState);
    host = result.host;
    fireDigitPress(result.el, '3');
    expect(callState.sendDigits).toHaveBeenCalledWith('3');
  });

  it('does not call sendDigits when context status is not connected', async () => {
    const callState = makeCallState({ status: 'ringing' as any });
    const result = await mountWithContext(callState);
    host = result.host;
    fireDigitPress(result.el, '3');
    expect(callState.sendDigits).not.toHaveBeenCalled();
  });

  it('subscribes to call.status$ when call prop is set', async () => {
    const call = makeCall('connecting');
    el = await mountDirect({ call: call as any });
    call.status$.next('connected');
    await el.updateComplete;
    await el.updateComplete;
    fireDigitPress(el, '1');
    expect(call.sendDigits).toHaveBeenCalledWith('1');
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall('connected');
    const call2 = makeCall('new');
    el = await mountDirect({ call: call1 as any });
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    fireDigitPress(el, '9');
    expect(call1.sendDigits).not.toHaveBeenCalled();
    expect(call2.sendDigits).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on disconnect', async () => {
    const call = makeCall('connected');
    el = await mountDirect({ call: call as any });
    el.remove();
    expect(() => call.status$.next('disconnected')).not.toThrow();
    el = null;
  });
});
