import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';

import './sw-participant-controls.js';
import type { SwParticipantControls } from './sw-participant-controls.js';

function makeParticipant(overrides: Partial<any> = {}) {
  return {
    id: 'p1',
    name: 'Alice',
    audioMuted: false,
    videoMuted: false,
    mute: vi.fn().mockResolvedValue(undefined),
    unmute: vi.fn().mockResolvedValue(undefined),
    muteVideo: vi.fn().mockResolvedValue(undefined),
    unmuteVideo: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
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
    hangup: vi.fn(), toggleLock: vi.fn(), toggleHold: vi.fn(), setLayout: vi.fn(),
    startRecording: vi.fn(), startStreaming: vi.fn(), sendDigits: vi.fn(),
    answer: vi.fn(), reject: vi.fn(),
    ...overrides,
  };
}

function makeCall(opts: { participants?: any[]; capabilities?: string[] } = {}) {
  return {
    id: 'c1',
    participants$: new BehaviorSubject<any[]>(opts.participants ?? []),
    capabilities$: new BehaviorSubject<string[]>(opts.capabilities ?? []),
  };
}

async function mountDirect(props: Partial<SwParticipantControls> = {}): Promise<SwParticipantControls> {
  const el = document.createElement('sw-participant-controls') as SwParticipantControls;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-participant-controls-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-participant-controls participant-id="p1"></sw-participant-controls>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-participant-controls-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-participant-controls') as SwParticipantControls;
  await el.updateComplete;
  return { host, el };
}

describe('sw-participant-controls', () => {
  let el: SwParticipantControls | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders "Participant not found" when participant is missing', async () => {
    el = await mountDirect({ participantId: 'unknown' });
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('Participant not found');
  });

  it('renders the participant name', async () => {
    const participant = makeParticipant({ id: 'p1', name: 'Alice' });
    const call = makeCall({ participants: [participant] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    expect(el.shadowRoot!.querySelector('.name')!.textContent).toContain('Alice');
  });

  it('shows "No actions available" when no capabilities and no showVolume/showPin', async () => {
    const call = makeCall({ participants: [makeParticipant()], capabilities: [] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    expect(el.shadowRoot!.querySelector('.actions .empty')!.textContent).toContain('No actions available');
  });

  it('renders mute audio button when memberMuteAudio capability is present', async () => {
    const call = makeCall({ participants: [makeParticipant()], capabilities: ['memberMuteAudio'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    expect(el.shadowRoot!.querySelector('button[class=""]')).toBeTruthy();
  });

  it('renders remove button when memberRemove capability is present', async () => {
    const call = makeCall({ participants: [makeParticipant()], capabilities: ['memberRemove'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    expect(el.shadowRoot!.querySelector('button.danger')).toBeTruthy();
  });

  it('does not render remove button without memberRemove capability', async () => {
    const call = makeCall({ participants: [makeParticipant()], capabilities: [] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    expect(el.shadowRoot!.querySelector('button.danger')).toBeNull();
  });

  it('renders volume slider when showVolume is true', async () => {
    const call = makeCall({ participants: [makeParticipant()] });
    el = await mountDirect({ participantId: 'p1', call: call as any, showVolume: true });
    expect(el.shadowRoot!.querySelector('input[type="range"]')).toBeTruthy();
  });

  it('renders pin button when showPin is true', async () => {
    const call = makeCall({ participants: [makeParticipant()] });
    el = await mountDirect({ participantId: 'p1', call: call as any, showPin: true });
    const buttons = el.shadowRoot!.querySelectorAll('button');
    const pinBtn = Array.from(buttons).find((b) => b.textContent?.includes('Pin'));
    expect(pinBtn).toBeTruthy();
  });

  it('calls participant.mute() when audio mute button is clicked', async () => {
    const participant = makeParticipant({ audioMuted: false });
    const call = makeCall({ participants: [participant], capabilities: ['memberMuteAudio'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    (el.shadowRoot!.querySelector('button[class=""]') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(participant.mute).toHaveBeenCalled();
  });

  it('calls participant.unmute() when participant is already muted', async () => {
    const participant = makeParticipant({ audioMuted: true });
    const call = makeCall({ participants: [participant], capabilities: ['memberMuteAudio'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    (el.shadowRoot!.querySelector('button.active') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(participant.unmute).toHaveBeenCalled();
  });

  it('calls participant.remove() when remove button is clicked', async () => {
    const participant = makeParticipant();
    const call = makeCall({ participants: [participant], capabilities: ['memberRemove'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    (el.shadowRoot!.querySelector('button.danger') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(participant.remove).toHaveBeenCalled();
  });

  it('dispatches sw-participant-volume-change when slider changes', async () => {
    const call = makeCall({ participants: [makeParticipant()] });
    el = await mountDirect({ participantId: 'p1', call: call as any, showVolume: true });
    const fired: CustomEvent[] = [];
    el.addEventListener('sw-participant-volume-change', (e) => fired.push(e as CustomEvent));
    const input = el.shadowRoot!.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = '50';
    input.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(fired.length).toBe(1);
    expect(fired[0]!.detail.volume).toBe(50);
    expect(fired[0]!.detail.participantId).toBe('p1');
  });

  it('dispatches sw-participant-pin-toggle when pin button is clicked', async () => {
    const call = makeCall({ participants: [makeParticipant()] });
    el = await mountDirect({ participantId: 'p1', call: call as any, showPin: true });
    const fired: CustomEvent[] = [];
    el.addEventListener('sw-participant-pin-toggle', (e) => fired.push(e as CustomEvent));
    const buttons = el.shadowRoot!.querySelectorAll('button');
    const pinBtn = Array.from(buttons).find((b) => b.textContent?.includes('Pin')) as HTMLButtonElement;
    pinBtn.click();
    await el.updateComplete;
    expect(fired.length).toBe(1);
    expect(fired[0]!.detail.pinned).toBe(true);
  });

  it('renders from context callState.participants and capabilities', async () => {
    const result = await mountWithContext({
      participants: [makeParticipant({ id: 'p1', name: 'Bob' })] as any,
      capabilities: ['memberRemove'],
    });
    host = result.host;
    expect(result.el.shadowRoot!.querySelector('.name')!.textContent).toContain('Bob');
    expect(result.el.shadowRoot!.querySelector('button.danger')).toBeTruthy();
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall({ participants: [makeParticipant()], capabilities: ['memberRemove'] });
    const call2 = makeCall();
    el = await mountDirect({ participantId: 'p1', call: call1 as any });
    expect(el.shadowRoot!.querySelector('button.danger')).toBeTruthy();
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toContain('Participant not found');
  });

  it('cleans up subscriptions on disconnect', async () => {
    const call = makeCall({ participants: [makeParticipant()], capabilities: ['memberRemove'] });
    el = await mountDirect({ participantId: 'p1', call: call as any });
    el.remove();
    expect(() => call.participants$.next([])).not.toThrow();
    el = null;
  });
});
