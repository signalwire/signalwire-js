import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

vi.mock('dompurify', () => ({ default: { sanitize: vi.fn((h: string) => h) } }));
vi.mock('marked', () => ({ marked: { parse: vi.fn().mockResolvedValue('') } }));

let mockCallStateConnect = vi.fn();
let mockCallStateDisconnect = vi.fn();

vi.mock('../../context/CallStateContextController.js', () => ({
  CallStateContextController: vi.fn().mockImplementation(() => ({
    connect: (...a: any[]) => mockCallStateConnect(...a),
    disconnect: (...a: any[]) => mockCallStateDisconnect(...a),
    hostConnected: vi.fn(), hostDisconnected: vi.fn(), hostUpdated: vi.fn(),
  })),
}));

let mockDevicesConnectCall = vi.fn();
let mockDevicesDisconnectCall = vi.fn();
let mockDevicesConnectDevices = vi.fn();
let mockDevicesDisconnect = vi.fn();
let mockDevicesRefresh = vi.fn();

vi.mock('../../context/DevicesContextController.js', () => ({
  DevicesContextController: vi.fn().mockImplementation(() => ({
    connectCall: (...a: any[]) => mockDevicesConnectCall(...a),
    disconnectCall: (...a: any[]) => mockDevicesDisconnectCall(...a),
    connectDevices: (...a: any[]) => mockDevicesConnectDevices(...a),
    disconnect: (...a: any[]) => mockDevicesDisconnect(...a),
    refreshDevices: (...a: any[]) => mockDevicesRefresh(...a),
    hostConnected: vi.fn(), hostDisconnected: vi.fn(), hostUpdated: vi.fn(),
  })),
}));

let mockTranscriptSetCall = vi.fn();
let mockTranscriptInjectEntry = vi.fn();

vi.mock('../../context/TranscriptController.js', () => ({
  TranscriptController: vi.fn().mockImplementation(() => ({
    setCall: (...a: any[]) => mockTranscriptSetCall(...a),
    injectEntry: (...a: any[]) => mockTranscriptInjectEntry(...a),
    state: { entries: [] },
    hostConnected: vi.fn(), hostDisconnected: vi.fn(), hostUpdated: vi.fn(),
  })),
}));

vi.mock('../../context/UserEventController.js', () => ({
  UserEventController: vi.fn().mockImplementation(() => ({
    setCall: vi.fn(),
    hostConnected: vi.fn(), hostDisconnected: vi.fn(), hostUpdated: vi.fn(),
  })),
}));

let mockIncomingConnect = vi.fn();
let mockIncomingDisconnect = vi.fn();

vi.mock('../../context/call-state-context.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    IncomingCallController: vi.fn().mockImplementation(() => ({
      connect: (...a: any[]) => mockIncomingConnect(...a),
      disconnect: (...a: any[]) => mockIncomingDisconnect(...a),
      set onIncomingCall(_: any) {},
      hostConnected: vi.fn(), hostDisconnected: vi.fn(), hostUpdated: vi.fn(),
    })),
  };
});

vi.mock('./client-factory.js', () => ({
  buildCredentialProvider: vi.fn().mockReturnValue({ token: 'mock' }),
}));

vi.mock('../../utils/theme-loader.js', () => ({
  ensureSignalWireTheme: vi.fn(),
  ensureSignalWireFonts: vi.fn(),
}));

const mockShowPrompt = vi.fn().mockResolvedValue(false);
vi.mock('../UI/sw-ui-alert.js', () => ({
  showPrompt: (...a: any[]) => mockShowPrompt(...a),
}));

vi.mock('../../utils/user-variables.js', () => ({
  parseUserVariablesAttribute: vi.fn().mockReturnValue({}),
  withWidgetCapabilities: vi.fn().mockReturnValue({}),
}));

const mockIsConnected$ = new BehaviorSubject<boolean>(false);
const mockDial = vi.fn();
const mockDestroy = vi.fn();

vi.mock('@signalwire/js', () => ({
  SignalWire: vi.fn().mockImplementation(() => ({
    isConnected$: mockIsConnected$,
    dial: mockDial,
    destroy: mockDestroy,
    session: { incomingCalls$: new BehaviorSubject([]) },
  })),
  getLogger: vi.fn().mockReturnValue({ error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));

import * as themeLoader from '../../utils/theme-loader.js';
import { SignalWire } from '@signalwire/js';

import './sw-call-widget.js';
import type { SwCallWidget } from './sw-call-widget.js';

function makeMockCall(status = 'connected') {
  const status$ = new BehaviorSubject<any>(status);
  const layoutLayers$ = new BehaviorSubject<any[]>([]);
  return {
    id: 'call-1', status, status$, layoutLayers$,
    hangup: vi.fn().mockResolvedValue(undefined),
    answer: vi.fn(), reject: vi.fn(),
  };
}

async function mount(props: Partial<SwCallWidget> = {}): Promise<SwCallWidget> {
  const el = document.createElement('sw-call-widget') as SwCallWidget;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('sw-call-widget', () => {
  let el: SwCallWidget | null = null;

  beforeEach(() => {
    mockIsConnected$.next(false);
    mockDial.mockReset();
    mockDestroy.mockReset();
    mockShowPrompt.mockReset().mockResolvedValue(false);
    mockCallStateConnect = vi.fn();
    mockCallStateDisconnect = vi.fn();
    mockDevicesConnectCall = vi.fn();
    mockDevicesDisconnectCall = vi.fn();
    mockDevicesConnectDevices = vi.fn();
    mockDevicesDisconnect = vi.fn();
    mockDevicesRefresh = vi.fn();
    mockTranscriptSetCall = vi.fn();
    mockTranscriptInjectEntry = vi.fn();
    mockIncomingConnect = vi.fn();
    mockIncomingDisconnect = vi.fn();
  });

  afterEach(() => { el?.remove(); el = null; });

  it('renders a slot when idle', async () => {
    el = await mount();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('renders sw-ui-modal when modal=true', async () => {
    el = await mount({ modal: true });
    expect(el.shadowRoot!.querySelector('sw-ui-modal')).toBeTruthy();
  });

  it('calls ensureSignalWireTheme on connectedCallback', async () => {
    el = await mount();
    expect(vi.mocked(themeLoader.ensureSignalWireTheme)).toHaveBeenCalled();
  });

  it('does not call ensureSignalWireTheme when disableAutoTheme=true', async () => {
    vi.mocked(themeLoader.ensureSignalWireTheme).mockClear();
    el = await mount({ disableAutoTheme: true });
    expect(vi.mocked(themeLoader.ensureSignalWireTheme)).not.toHaveBeenCalled();
  });

  it('does not call ensureSignalWireFonts when disableAutoFonts=true', async () => {
    vi.mocked(themeLoader.ensureSignalWireFonts).mockClear();
    el = await mount({ disableAutoFonts: true });
    expect(vi.mocked(themeLoader.ensureSignalWireFonts)).not.toHaveBeenCalled();
  });

  it('reflects modal attribute', async () => {
    el = await mount({ modal: true });
    expect(el.hasAttribute('modal')).toBe(true);
  });

  it('reflects audio-only attribute', async () => {
    el = await mount({ audioOnly: true });
    expect(el.hasAttribute('audio-only')).toBe(true);
  });

  it('reflects transcription attribute', async () => {
    el = await mount({ transcription: true });
    expect(el.hasAttribute('transcription')).toBe(true);
  });

  it('initializes SignalWire client and calls connectDevices when token is set', async () => {
    el = await mount({ token: 'tok' });
    expect(mockDevicesConnectDevices).toHaveBeenCalled();
  });

  it('destroys previous client before creating new one on token change', async () => {
    el = await mount({ token: 'tok1' });
    el.token = 'tok2';
    await el.updateComplete;
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('dial() does nothing when no client is initialized (no token)', async () => {
    el = await mount({ destination: 'sip:bob@example.com' });
    await el.dial();
    expect(mockDial).not.toHaveBeenCalled();
  });

  it('dial() does nothing when _call is already active', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    (el as any)._call = makeMockCall();
    await el.dial();
    expect(mockDial).not.toHaveBeenCalled();
  });

  it('dial() shows prompt and does not dial when no destination', async () => {
    el = await mount({ token: 'tok' });
    await el.dial();
    expect(mockShowPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Call Error' })
    );
    expect(mockDial).not.toHaveBeenCalled();
  });

  it('dial() dispatches sw-dial event with destination', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const fired: CustomEvent[] = [];
    el.addEventListener('sw-dial', (e) => fired.push(e as CustomEvent));
    void el.dial();
    expect(fired.length).toBe(1);
    expect(fired[0]!.detail.destination).toBe('sip:bob@example.com');
  });

  it('dial() happy path: dials the destination and wires the call', async () => {
    const call = makeMockCall('connected');
    mockDial.mockResolvedValue(call);
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    mockIsConnected$.next(true);
    await el.dial();
    expect(mockDial).toHaveBeenCalledWith(
      'sip:bob@example.com',
      expect.objectContaining({ audio: true, video: true, receiveAudio: true, receiveVideo: true })
    );
    expect(mockCallStateConnect).toHaveBeenCalledWith(call);
    expect(mockDevicesConnectCall).toHaveBeenCalledWith(call);
    expect((el as any)._call).toBe(call);
  });

  it('dial() requests audio-only when audioOnly=true', async () => {
    const call = makeMockCall('connected');
    mockDial.mockResolvedValue(call);
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com', audioOnly: true });
    mockIsConnected$.next(true);
    await el.dial();
    expect(mockDial).toHaveBeenCalledWith(
      'sip:bob@example.com',
      expect.objectContaining({ video: false, receiveVideo: false })
    );
  });

  it('dial() shows prompt when the dial promise rejects', async () => {
    mockDial.mockRejectedValue(new Error('boom'));
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    mockIsConnected$.next(true);
    await el.dial();
    expect(mockShowPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Call Failed' })
    );
    expect((el as any)._call).toBeNull();
  });

  it('_wireCall connects callState, devices and transcript', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall();
    (el as any)._wireCall(call);
    expect(mockCallStateConnect).toHaveBeenCalledWith(call);
    expect(mockDevicesConnectCall).toHaveBeenCalledWith(call);
    expect(mockTranscriptSetCall).toHaveBeenCalledWith(call);
  });

  it('_wireCall subscribes to layoutLayers$ and sets _hasLayoutLayers', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall();
    (el as any)._wireCall(call);
    call.layoutLayers$.next([{ id: 'l1' }]);
    await el.updateComplete;
    expect((el as any)._hasLayoutLayers).toBe(true);
  });

  it('hangup() calls _call.hangup()', async () => {
    const call = makeMockCall();
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    (el as any)._call = call;
    await el.hangup();
    expect(call.hangup).toHaveBeenCalled();
  });

  it('hangup() is a no-op when no active call', async () => {
    el = await mount({ token: 'tok' });
    await expect(el.hangup()).resolves.toBeUndefined();
  });

  it('dispatches sw-call-ended when call reaches disconnected status', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall('connected');
    (el as any)._wireCall(call);
    await el.updateComplete;

    const fired: CustomEvent[] = [];
    el.addEventListener('sw-call-ended', (e) => fired.push(e as CustomEvent));
    call.status$.next('disconnected');
    await el.updateComplete;

    expect(fired.length).toBe(1);
    expect(fired[0]!.detail).toHaveProperty('status');
  });

  it('dispatches sw-call-ended when call reaches failed status', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall('connected');
    (el as any)._wireCall(call);
    await el.updateComplete;

    const fired: CustomEvent[] = [];
    el.addEventListener('sw-call-ended', (e) => fired.push(e as CustomEvent));
    call.status$.next('failed');
    await el.updateComplete;

    expect(fired.length).toBe(1);
  });

  it('clears _call after terminal status', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall('connected');
    (el as any)._wireCall(call);
    await el.updateComplete;
    call.status$.next('destroyed');
    await el.updateComplete;
    expect((el as any)._call).toBeNull();
  });

  it('disconnects callState and devices after terminal status', async () => {
    el = await mount({ token: 'tok', destination: 'sip:bob@example.com' });
    const call = makeMockCall('connected');
    (el as any)._wireCall(call);
    await el.updateComplete;
    call.status$.next('disconnected');
    await el.updateComplete;
    expect(mockCallStateDisconnect).toHaveBeenCalled();
    expect(mockDevicesDisconnectCall).toHaveBeenCalled();
  });

  describe('disconnect cleanup', () => {
    beforeEach(async () => {
      el = await mount({ token: 'tok' });
      mockDestroy.mockClear();
      mockDevicesDisconnect.mockClear();
    });

    it('calls client.destroy on disconnect', () => {
      expect(mockDestroy).not.toHaveBeenCalled();
      el!.remove();
      expect(mockDestroy).toHaveBeenCalled();
      el = null;
    });

    it('calls _devices.disconnect on disconnectedCallback', () => {
      expect(mockDevicesDisconnect).not.toHaveBeenCalled();
      el!.remove();
      expect(mockDevicesDisconnect).toHaveBeenCalled();
      el = null;
    });
  });

  it('sw-ui-modal open prop is false when idle', async () => {
    el = await mount({ modal: true });
    const modal = el.shadowRoot!.querySelector('sw-ui-modal');
    expect(modal!.hasAttribute('open')).toBe(false);
  });

  it('sw-ui-modal open prop is true when call is active', async () => {
    el = await mount({ modal: true });
    const call = makeMockCall();
    (el as any)._call = call;
    await el.updateComplete;
    const modal = el.shadowRoot!.querySelector('sw-ui-modal');
    expect(modal!.hasAttribute('open')).toBe(true);
  });

  it('shows a Client Error prompt when client init fails', async () => {
    vi.mocked(SignalWire).mockImplementationOnce(() => { throw new Error('init fail'); });
    el = await mount({ token: 'tok' });
    expect(mockShowPrompt).toHaveBeenCalledWith(
      // description pins the `e instanceof Error ? e.message` branch.
      expect.objectContaining({ title: 'Client Error', description: 'init fail' })
    );
  });

  it('does not throw when client.destroy fails on disconnect', async () => {
    mockDestroy.mockImplementation(() => { throw new Error('destroy fail'); });
    el = await mount({ token: 'tok' });
    expect(() => el!.remove()).not.toThrow();
    el = null;
  });

  it('connects incoming calls once connected when allowIncomingCalls is set', async () => {
    el = await mount({ token: 'tok', allowIncomingCalls: true });
    mockIsConnected$.next(true);
    expect(mockIncomingConnect).toHaveBeenCalled();
  });

  // The sibling test above reaches _connectIncomingCalls from _refreshClient, so
  // this covers the other caller: the allowIncomingCalls-turned-on branch in
  // updated(), which only runs when the flag changes without a token change.
  it('connects incoming calls when allowIncomingCalls is turned on', async () => {
    el = await mount({ token: 'tok', allowIncomingCalls: false });
    mockIncomingConnect.mockClear();

    el.allowIncomingCalls = true;
    await el.updateComplete;
    mockIsConnected$.next(true);

    expect(mockIncomingConnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects incoming calls when allowIncomingCalls is turned off', async () => {
    el = await mount({ token: 'tok', allowIncomingCalls: true });
    // mount() already routes through _refreshClient -> _destroyClient, which
    // disconnects unconditionally. Without clearing, this passes even if the
    // allowIncomingCalls branch is deleted.
    mockIncomingDisconnect.mockClear();
    el.allowIncomingCalls = false;
    await el.updateComplete;
    expect(mockIncomingDisconnect).toHaveBeenCalledTimes(1);
  });

  it('_handleIncomingCall answers the call when the user accepts', async () => {
    mockShowPrompt.mockResolvedValue(true);
    el = await mount({ token: 'tok' });
    const call = makeMockCall();
    await (el as any)._handleIncomingCall({ call, callerName: 'Alice' });
    expect(call.answer).toHaveBeenCalled();
  });

  it('_handleIncomingCall rejects the call when the user declines', async () => {
    mockShowPrompt.mockResolvedValue(false);
    el = await mount({ token: 'tok' });
    const call = makeMockCall();
    await (el as any)._handleIncomingCall({ call, callerNumber: '+15551234' });
    expect(call.reject).toHaveBeenCalled();
  });

  // The handlers below are reached through the bindings in
  // sw-call-widget.templates.ts rather than called directly, so each test covers
  // the handler and its wiring, and survives a rename.
  describe('call view event bindings', () => {
    async function mountWithActiveCall(props: Partial<SwCallWidget> = {}) {
      const call = makeMockCall();
      const widget = await mount({ token: 'tok', ...props });
      (widget as any)._call = call;
      await widget.updateComplete;
      return { widget, call };
    }

    function controls(widget: SwCallWidget) {
      return widget.shadowRoot!.querySelector('sw-call-controls')!;
    }

    it('toggles transcription on sw-transcript-toggle from the controls', async () => {
      const { widget } = await mountWithActiveCall({ transcription: false });
      el = widget;

      controls(widget).dispatchEvent(new CustomEvent('sw-transcript-toggle'));
      expect(widget.transcription).toBe(true);

      await widget.updateComplete;
      controls(widget).dispatchEvent(new CustomEvent('sw-transcript-toggle'));
      expect(widget.transcription).toBe(false);
    });

    it('hangs up on sw-call-hangup from the controls', async () => {
      const { widget, call } = await mountWithActiveCall();
      el = widget;

      controls(widget).dispatchEvent(new CustomEvent('sw-call-hangup'));
      expect(call.hangup).toHaveBeenCalled();
    });

    it('toggles fullscreen on the layout on sw-fullscreen-toggle', async () => {
      const { widget } = await mountWithActiveCall();
      el = widget;

      const layout = widget.shadowRoot!.querySelector('sw-ui-call-layout') as any;
      const toggleFullscreen = vi.fn();
      layout.toggleFullscreen = toggleFullscreen;

      controls(widget).dispatchEvent(new CustomEvent('sw-fullscreen-toggle'));
      expect(toggleFullscreen).toHaveBeenCalled();
    });

    it('is a no-op on sw-fullscreen-toggle when no layout is rendered', async () => {
      el = await mount({ token: 'tok' });
      expect(() => (el as any)._onFullscreenToggle()).not.toThrow();
    });

    it('clears the drawer on sw-content-drawer-close', async () => {
      const { widget } = await mountWithActiveCall();
      el = widget;
      (widget as any)._drawer = { title: 'x' };
      await widget.updateComplete;

      widget.shadowRoot!
        .querySelector('sw-ui-content-drawer')!
        .dispatchEvent(new CustomEvent('sw-content-drawer-close'));
      expect((widget as any)._drawer).toBeNull();
    });

    it('hangs up on sw-modal-close when a call is active', async () => {
      const { widget, call } = await mountWithActiveCall({ modal: true });
      el = widget;

      widget.shadowRoot!
        .querySelector('sw-ui-modal')!
        .dispatchEvent(new CustomEvent('sw-modal-close'));
      expect(call.hangup).toHaveBeenCalled();
    });

    it('prevents sw-modal-close when idle with no destination', async () => {
      el = await mount({ token: 'tok', modal: true });
      const event = new CustomEvent('sw-modal-close', { cancelable: true });

      el.shadowRoot!.querySelector('sw-ui-modal')!.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('sw-display-content', () => {
    const detail = { title: 'Shared content' };

    it('sets the drawer and injects a system transcript entry', async () => {
      el = await mount({ token: 'tok' });
      // _wireCall registers the listener; dispatching covers the wiring too.
      (el as any)._wireCall(makeMockCall());

      el.dispatchEvent(new CustomEvent('sw-display-content', { detail }));

      expect((el as any)._drawer).toBe(detail);
      expect(mockTranscriptInjectEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          state: 'complete',
          text: 'Shared content',
          meta: { displayContent: detail },
        })
      );
    });

    it('stops handling the event once the call is unwired', async () => {
      el = await mount({ token: 'tok' });
      const call = makeMockCall('connected');
      (el as any)._wireCall(call);
      await el.updateComplete;

      call.status$.next('disconnected');
      await el.updateComplete;
      mockTranscriptInjectEntry.mockClear();

      el.dispatchEvent(new CustomEvent('sw-display-content', { detail }));
      expect(mockTranscriptInjectEntry).not.toHaveBeenCalled();
    });
  });
});
