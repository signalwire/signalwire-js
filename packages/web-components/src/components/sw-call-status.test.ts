import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';

import './sw-call-status.js';
import type { SwCallStatus } from './sw-call-status.js';

function makeCallState(overrides: Partial<CallState> = {}): CallState {
  return {
    id: 'call-1', direction: 'outbound', to: undefined, status: 'new' as any,
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

function makeCall(initialStatus: string = 'new') {
  return {
    id: 'c1',
    status$: new BehaviorSubject<any>(initialStatus),
  };
}

async function mountDirect(props: Partial<SwCallStatus> = {}): Promise<SwCallStatus> {
  const el = document.createElement('sw-call-status') as SwCallStatus;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-call-status-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-call-status></sw-call-status>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-call-status-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-call-status') as SwCallStatus;
  await el.updateComplete;
  return { host, el };
}

describe('sw-call-status', () => {
  let el: SwCallStatus | null = null;
  let host: TestHost | null = null;

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); el?.remove(); el = null; host?.remove(); host = null; });

  it('renders a container with status indicator and status text', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelector('.container')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.status-indicator')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.status-text')).toBeTruthy();
  });

  it('shows "Ready" and new class by default', async () => {
    el = await mountDirect();
    const text = el.shadowRoot!.querySelector('.status-text')!;
    expect(text.textContent!.trim()).toBe('Ready');
    expect(text.classList.contains('new')).toBe(true);
  });

  it('shows correct text for each status', async () => {
    const cases: [string, string][] = [
      ['trying', 'Trying...'],
      ['connecting', 'Connecting...'],
      ['ringing', 'Ringing...'],
      ['connected', 'Connected'],
      ['recovering', 'Reconnecting...'],
      ['disconnecting', 'Disconnecting...'],
      ['disconnected', 'Disconnected'],
      ['failed', 'Failed'],
      ['destroyed', 'Ended'],
    ];
    for (const [status, expected] of cases) {
      const result = await mountWithContext({ status: status as any });
      host = result.host;
      const text = result.el.shadowRoot!.querySelector('.status-text')!.textContent!.trim();
      expect(text).toBe(expected);
      host.remove();
      host = null;
    }
  });

  it('shows duration element only when status is connected', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelector('.duration')).toBeNull();
    const result = await mountWithContext({ status: 'connected' as any });
    host = result.host;
    expect(result.el.shadowRoot!.querySelector('.duration')).toBeTruthy();
  });

  it('starts duration timer when status transitions to connected', async () => {
    const result = await mountWithContext({ status: 'connecting' as any });
    host = result.host;
    host.provider.setValue(makeCallState({ status: 'connected' as any }));
    await result.el.updateComplete;
    vi.advanceTimersByTime(65000);
    await result.el.updateComplete;
    const duration = result.el.shadowRoot!.querySelector('.duration')!.textContent!.trim();
    expect(duration).toBe('1:05');
  });

  it('stops duration timer when status leaves connected', async () => {
    const result = await mountWithContext({ status: 'connected' as any });
    host = result.host;
    vi.advanceTimersByTime(5000);
    host.provider.setValue(makeCallState({ status: 'disconnected' as any }));
    await result.el.updateComplete;
    expect(result.el.shadowRoot!.querySelector('.duration')).toBeNull();
  });

  it('subscribes to call.status$ and reflects status', async () => {
    const call = makeCall('connecting');
    el = await mountDirect({ call: call as any });
    const text = el.shadowRoot!.querySelector('.status-text')!;
    expect(text.textContent!.trim()).toBe('Connecting...');
  });

  it('updates when call.status$ emits a new value', async () => {
    const call = makeCall('connecting');
    el = await mountDirect({ call: call as any });
    call.status$.next('connected');
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.status-text')!.textContent!.trim()).toBe('Connected');
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall('connecting');
    const call2 = makeCall('ringing');
    el = await mountDirect({ call: call1 as any });
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    call1.status$.next('failed');
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.status-text')!.textContent!.trim()).toBe('Ringing...');
  });

  it('renders from context callState.status', async () => {
    const result = await mountWithContext({ status: 'ringing' as any });
    host = result.host;
    expect(result.el.shadowRoot!.querySelector('.status-text')!.textContent!.trim()).toBe('Ringing...');
  });

  it('stops timer and cleans up on disconnect', async () => {
    const call = makeCall('connected');
    el = await mountDirect({ call: call as any });
    await el.updateComplete;
    vi.advanceTimersByTime(3000);
    el.remove();
    expect(() => call.status$.next('disconnected')).not.toThrow();
    el = null;
  });
});
