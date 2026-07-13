import { describe, it, expect, afterEach, vi } from 'vitest';
import { ContextProvider } from '@lit/context';
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BehaviorSubject } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { LayoutLayer } from '../types/index.js';

import './sw-participants.js';
import type { SwParticipants } from './sw-participants.js';

function makeLayer(overrides: Partial<LayoutLayer> = {}): LayoutLayer {
  return { member_id: 'member-1', x: 0, y: 0, width: 50, height: 50, visible: true, ...overrides } as unknown as LayoutLayer;
}

function makeParticipant(overrides: Partial<any> = {}) {
  return {
    id: 'member-1',
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

function makeCall(opts: { layoutLayers?: LayoutLayer[]; participants?: any[]; self?: any } = {}) {
  return {
    id: 'c1',
    layoutLayers$: new BehaviorSubject<LayoutLayer[]>(opts.layoutLayers ?? []),
    participants$: new BehaviorSubject<any[]>(opts.participants ?? []),
    self$: new BehaviorSubject<any>(opts.self ?? null),
  };
}

async function mountDirect(props: Partial<SwParticipants> = {}): Promise<SwParticipants> {
  const el = document.createElement('sw-participants') as SwParticipants;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  await el.updateComplete;
  return el;
}

@customElement('test-sw-participants-host')
class TestHost extends LitElement {
  provider!: ContextProvider<typeof callStateContext>;
  connectedCallback() {
    super.connectedCallback();
    this.provider = new ContextProvider(this, { context: callStateContext, initialValue: makeCallState() });
  }
  render() { return html`<sw-participants></sw-participants>`; }
}

async function mountWithContext(callState?: Partial<CallState>) {
  const host = document.createElement('test-sw-participants-host') as TestHost;
  document.body.appendChild(host);
  await host.updateComplete;
  if (callState) host.provider.setValue(makeCallState(callState));
  await host.updateComplete;
  const el = host.shadowRoot!.querySelector('sw-participants') as SwParticipants;
  await el.updateComplete;
  return { host, el };
}

describe('sw-participants', () => {
  let el: SwParticipants | null = null;
  let host: TestHost | null = null;

  afterEach(() => { el?.remove(); el = null; host?.remove(); host = null; });

  it('renders no overlays when there are no layers', async () => {
    el = await mountDirect();
    expect(el.shadowRoot!.querySelectorAll('.member-overlay').length).toBe(0);
  });

  it('renders an overlay for each layer', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'a' }), makeLayer({ member_id: 'b' })] });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelectorAll('.member-overlay').length).toBe(2);
  });

  it('renders is-self class for the self member layer', async () => {
    const call = makeCall({
      layoutLayers: [makeLayer({ member_id: 'self-1' })],
      self: { id: 'self-1' },
    });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelector('.member-overlay.is-self')).toBeTruthy();
  });

  it('does not render menu-trigger for the self layer', async () => {
    const call = makeCall({
      layoutLayers: [makeLayer({ member_id: 'self-1' })],
      self: { id: 'self-1' },
    });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelector('.menu-trigger')).toBeNull();
  });

  it('renders menu-trigger for non-self layers', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'other-1' })] });
    el = await mountDirect({ call: call as any });
    expect(el.shadowRoot!.querySelector('.menu-trigger')).toBeTruthy();
  });

  it('toggles menu-dropdown open on menu-trigger click', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'other-1' })] });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.menu-dropdown.open')).toBeTruthy();
  });

  it('closes menu on second menu-trigger click', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'other-1' })] });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;
    trigger.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.menu-dropdown.open')).toBeNull();
  });

  it('closes menu on Escape key press', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'other-1' })] });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.menu-dropdown.open')).toBeNull();
  });

  it('closes menu on outside click', async () => {
    const call = makeCall({ layoutLayers: [makeLayer({ member_id: 'other-1' })] });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.menu-dropdown.open')).toBeNull();
  });

  it('dispatches sw-participant-mute-audio and calls participant.mute()', async () => {
    const participant = makeParticipant({ id: 'other-1', audioMuted: false });
    const call = makeCall({
      layoutLayers: [makeLayer({ member_id: 'other-1' })],
      participants: [participant],
    });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;

    const fired: CustomEvent[] = [];
    el.addEventListener('sw-participant-mute-audio', (e) => fired.push(e as CustomEvent));

    const muteBtn = el.shadowRoot!.querySelector('.menu-item[aria-label="Mute audio"]') as HTMLButtonElement;
    muteBtn.click();
    await el.updateComplete;

    expect(participant.mute).toHaveBeenCalled();
    expect(fired.length).toBe(1);
    expect(fired[0]!.detail.memberId).toBe('other-1');
  });

  it('dispatches sw-participant-remove and calls participant.remove()', async () => {
    const participant = makeParticipant({ id: 'other-1' });
    const call = makeCall({
      layoutLayers: [makeLayer({ member_id: 'other-1' })],
      participants: [participant],
    });
    el = await mountDirect({ call: call as any });
    const trigger = el.shadowRoot!.querySelector('.menu-trigger') as HTMLButtonElement;
    trigger.click();
    await el.updateComplete;

    const fired: CustomEvent[] = [];
    el.addEventListener('sw-participant-remove', (e) => fired.push(e as CustomEvent));

    const removeBtn = el.shadowRoot!.querySelector('.menu-item[aria-label="Remove participant"]') as HTMLButtonElement;
    removeBtn.click();
    await el.updateComplete;

    expect(participant.remove).toHaveBeenCalled();
    expect(fired.length).toBe(1);
  });

  it('renders overlays from context callState.layoutLayers', async () => {
    const result = await mountWithContext({
      layoutLayers: [makeLayer({ member_id: 'ctx-1' })],
    });
    host = result.host;
    await result.el.updateComplete;
    expect(result.el.shadowRoot!.querySelector('.member-overlay')).toBeTruthy();
  });

  it('tears down subscriptions when call prop changes', async () => {
    const call1 = makeCall({ layoutLayers: [makeLayer({ member_id: 'a' })] });
    const call2 = makeCall();
    el = await mountDirect({ call: call1 as any });
    expect(el.shadowRoot!.querySelectorAll('.member-overlay').length).toBe(1);
    el.call = call2 as any;
    await el.updateComplete;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelectorAll('.member-overlay').length).toBe(0);
  });

  it('removes event listeners on disconnect', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el = await mountDirect();
    el.remove();
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
    el = null;
  });
});
