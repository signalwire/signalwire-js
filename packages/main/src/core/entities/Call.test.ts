import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';

import { PreferencesContainer } from '../../containers/PreferencesContainer';
import { WebRTCCall } from './Call';

import type { ClientSession } from '../../interfaces/ClientSession';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { WebRTCVerto } from '../../interfaces/WebRTCVerto';
import type { CallEventsManager } from '../../managers/CallEventsManager';
import type { CallInitialization, CallManagers } from './Call';
import type { CallOptions } from './types/call.types';
import type { MemberTarget } from '../RPCMessages/types/common';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockClientSession(
  signalingEvent$?: Subject<Record<string, unknown>>
): ClientSession {
  return {
    signalingEvent$: signalingEvent$ ?? new Subject<Record<string, unknown>>(),
    authenticated$: new BehaviorSubject<boolean>(true),
    iceServers: undefined,
    execute: vi.fn().mockResolvedValue({ id: 1, result: {} })
  } as unknown as ClientSession;
}

function createMockVertoManager(): WebRTCVerto {
  return {
    selfId$: new BehaviorSubject<string | null>('test-member-id'),
    selfId: 'test-member-id',
    nodeId$: new BehaviorSubject<string | null>('test-node-id'),
    nodeId: 'test-node-id',
    localStream$: new BehaviorSubject<MediaStream>(new MediaStream()),
    localStream: new MediaStream(),
    remoteStream$: new BehaviorSubject<MediaStream>(new MediaStream()),
    remoteStream: new MediaStream(),
    mediaDirections$: new BehaviorSubject({ audio: 'sendrecv', video: 'sendrecv' }),
    mediaDirections: { audio: 'sendrecv', video: 'sendrecv' },
    signalingStatus$: new Subject(),
    mainPeerConnection: { peerConnection: undefined },
    bye: vi.fn().mockResolvedValue(undefined),
    sendDigits: vi.fn().mockResolvedValue(undefined),
    hold: vi.fn().mockResolvedValue(undefined),
    unhold: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    transfer: vi.fn().mockResolvedValue(undefined)
  } as unknown as WebRTCVerto;
}

function createMockCallEventsManager(): CallEventsManager {
  return {
    participants$: new BehaviorSubject([]),
    participants: [],
    self$: new Subject(),
    recording$: new BehaviorSubject(false),
    recording: false,
    streaming$: new BehaviorSubject(false),
    streaming: false,
    raiseHandPriority$: new BehaviorSubject(false),
    raiseHandPriority: false,
    locked$: new BehaviorSubject(false),
    locked: false,
    meta$: new BehaviorSubject({}),
    meta: {},
    capabilities$: new BehaviorSubject([]),
    capabilities: [],
    layout$: new BehaviorSubject(''),
    layout: undefined,
    layouts$: new BehaviorSubject([]),
    layouts: [],
    layoutLayers$: new BehaviorSubject([]),
    layoutLayers: [],
    self: null,
    addCallId: vi.fn(),
    isCallIdValid: vi.fn().mockReturnValue(false),
    isRoomSessionIdValid: vi.fn().mockReturnValue(false),
    destroy: vi.fn()
  } as unknown as CallEventsManager;
}

function createMockDeviceController(): DeviceController {
  return {
    audioInputDevices$: new BehaviorSubject([]),
    audioOutputDevices$: new BehaviorSubject([]),
    videoInputDevices$: new BehaviorSubject([]),
    selectedAudioInputDevice$: new BehaviorSubject(null),
    selectedAudioOutputDevice$: new BehaviorSubject(null),
    selectedVideoInputDevice$: new BehaviorSubject(null),
    selectedAudioInputDevice: null,
    selectedAudioOutputDevice: null,
    selectedVideoInputDevice: null,
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn().mockReturnValue({}),
    selectAudioInputDevice: vi.fn(),
    selectVideoInputDevice: vi.fn(),
    selectAudioOutputDevice: vi.fn(),
    enableDeviceMonitoring: vi.fn(),
    disableDeviceMonitoring: vi.fn(),
    getDeviceCapabilities: vi.fn().mockResolvedValue(null),
    isValidDevice: vi.fn().mockResolvedValue(true),
    errors$: new Subject()
  } as unknown as DeviceController;
}

interface TestContext {
  signalingEvent$: Subject<Record<string, unknown>>;
  clientSession: ClientSession;
  vertoManager: WebRTCVerto;
  callEventsManager: CallEventsManager;
  deviceController: DeviceController;
  initialization: CallInitialization;
}

function createTestContext(): TestContext {
  const signalingEvent$ = new Subject<Record<string, unknown>>();
  const clientSession = createMockClientSession(signalingEvent$);
  const vertoManager = createMockVertoManager();
  const callEventsManager = createMockCallEventsManager();
  const deviceController = createMockDeviceController();

  const initialization: CallInitialization = {
    initializeManagers: vi.fn().mockReturnValue({
      vertoManager,
      callEventsManager
    } satisfies CallManagers),
    deviceController
  };

  return {
    signalingEvent$,
    clientSession,
    vertoManager,
    callEventsManager,
    deviceController,
    initialization
  };
}

function createCall(ctx: TestContext, optionsOverrides: Partial<CallOptions> = {}): WebRTCCall {
  const options: CallOptions = {
    callId: 'test-call-id',
    to: '/public/test-room',
    ...optionsOverrides
  };

  return new WebRTCCall(ctx.clientSession, options, ctx.initialization);
}

/**
 * Builds the unwrapped signalwire.event metadata that `signalingEvent$` emits.
 * The stream delivers the inner `params` of the JSONRPC wrapper, so the shape
 * is `{ event_type, params: <WebrtcMessagePayload> }`.
 */
function buildWebrtcMessageEvent(
  callID: string,
  innerParams: Record<string, unknown>
): Record<string, unknown> {
  return {
    event_type: 'webrtc.message',
    event_channel: 'test-channel',
    timestamp: Date.now(),
    project_id: 'test-project',
    node_id: 'test-node',
    params: {
      jsonrpc: '2.0',
      id: 1,
      method: 'verto.media',
      params: {
        callID,
        ...innerParams
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCCall - userVariables', () => {
  let ctx: TestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset PreferencesContainer singleton state
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
    ctx = createTestContext();
  });

  afterEach(() => {
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
  });

  // -------------------------------------------------------------------------
  // Initialization / merge order
  // -------------------------------------------------------------------------

  describe('initialization', () => {
    it('should initialize with empty userVariables when no sources provide values', () => {
      const call = createCall(ctx, { to: undefined, userVariables: undefined });

      expect(call.userVariables).toEqual({});

      call.destroy();
    });

    it('should seed userVariables from PreferencesContainer', () => {
      (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
        {
          theme: 'dark',
          lang: 'en'
        };

      const call = createCall(ctx, { to: undefined, userVariables: undefined });

      expect(call.userVariables).toEqual({ theme: 'dark', lang: 'en' });

      call.destroy();
    });

    it('should merge destination query params into userVariables', () => {
      const call = createCall(ctx, {
        to: '/public/test-room?campaign=summer&ref=landing',
        userVariables: undefined
      });

      expect(call.userVariables).toMatchObject({
        campaign: 'summer',
        ref: 'landing'
      });

      call.destroy();
    });

    it('should merge options.userVariables on top of preferences and destination params', () => {
      (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
        {
          prefKey: 'fromPrefs',
          shared: 'prefs'
        };

      const call = createCall(ctx, {
        to: '/public/room?shared=destParam&destOnly=yes',
        userVariables: { shared: 'fromOptions', optionOnly: 42 }
      });

      // Merge order: prefs -> destination params -> options
      expect(call.userVariables).toEqual({
        prefKey: 'fromPrefs',
        shared: 'fromOptions',
        destOnly: 'yes',
        optionOnly: 42
      });

      call.destroy();
    });

    it('should handle destinations that cannot be parsed as URL gracefully', () => {
      // A plain string without query params should not crash
      const call = createCall(ctx, { to: 'simple-destination', userVariables: { key: 'value' } });

      expect(call.userVariables).toMatchObject({ key: 'value' });

      call.destroy();
    });

    it('should handle empty destination string', () => {
      const call = createCall(ctx, { to: '', userVariables: { key: 'value' } });

      expect(call.userVariables).toMatchObject({ key: 'value' });

      call.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Getter immutability
  // -------------------------------------------------------------------------

  describe('getter immutability', () => {
    it('should return a defensive copy from the getter', () => {
      const call = createCall(ctx, { userVariables: { original: true } });

      const vars = call.userVariables;
      vars.mutated = true;

      expect(call.userVariables).not.toHaveProperty('mutated');
      expect(call.userVariables).toEqual({ original: true });

      call.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Setter merge behavior
  // -------------------------------------------------------------------------

  describe('setter', () => {
    it('should merge new variables with existing ones', () => {
      const call = createCall(ctx, { userVariables: { a: 1, b: 2 } });

      call.userVariables = { b: 'updated', c: 3 };

      expect(call.userVariables).toEqual({ a: 1, b: 'updated', c: 3 });

      call.destroy();
    });

    it('should not remove existing variables when setting a partial update', () => {
      const call = createCall(ctx, { userVariables: { first: 1, second: 2, third: 3 } });

      call.userVariables = { fourth: 4 };

      expect(call.userVariables).toEqual({ first: 1, second: 2, third: 3, fourth: 4 });

      call.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Observable emissions
  // -------------------------------------------------------------------------

  describe('userVariables$ observable', () => {
    it('should emit current value immediately on subscribe', async () => {
      const call = createCall(ctx, { userVariables: { initial: true } });
      const emissions: Record<string, unknown>[] = [];

      const sub = call.userVariables$.subscribe((vars) => emissions.push(vars));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emissions).toHaveLength(1);
      expect(emissions[0]).toEqual({ initial: true });

      sub.unsubscribe();
      call.destroy();
    });

    it('should emit when setter is used', async () => {
      const call = createCall(ctx, { userVariables: { a: 1 } });
      const emissions: Record<string, unknown>[] = [];

      const sub = call.userVariables$.subscribe((vars) => emissions.push(vars));
      await new Promise((resolve) => setTimeout(resolve, 0));

      call.userVariables = { b: 2 };
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emissions).toHaveLength(2);
      expect(emissions[1]).toEqual({ a: 1, b: 2 });

      sub.unsubscribe();
      call.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Updates from webrtc.message events
  // -------------------------------------------------------------------------

  describe('updates from webrtcMessages$', () => {
    it('should merge userVariables from incoming webrtc.message events', async () => {
      const call = createCall(ctx, {
        callId: 'call-abc',
        userVariables: { local: 'value' }
      });
      const emissions: Record<string, unknown>[] = [];
      const sub = call.userVariables$.subscribe((vars) => emissions.push(vars));

      // Emit a webrtc.message event with userVariables through the signaling pipe
      ctx.signalingEvent$.next(
        buildWebrtcMessageEvent('call-abc', { userVariables: { remote: 'data' } })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should have merged the remote variables
      expect(call.userVariables).toEqual({ local: 'value', remote: 'data' });

      sub.unsubscribe();
      call.destroy();
    });

    it('should not update userVariables when message has no userVariables', async () => {
      const call = createCall(ctx, {
        callId: 'call-abc',
        userVariables: { existing: true }
      });
      const emissions: Record<string, unknown>[] = [];
      const sub = call.userVariables$.subscribe((vars) => emissions.push(vars));
      await new Promise((resolve) => setTimeout(resolve, 0));

      ctx.signalingEvent$.next(buildWebrtcMessageEvent('call-abc', { sdp: 'some-sdp' }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      // No new emission for userVariables (initial only)
      expect(emissions).toHaveLength(1);
      expect(call.userVariables).toEqual({ existing: true });

      sub.unsubscribe();
      call.destroy();
    });

    it('should ignore events not matching the call ID', () => {
      const call = createCall(ctx, {
        callId: 'call-abc',
        userVariables: { mine: true }
      });

      ctx.signalingEvent$.next(
        buildWebrtcMessageEvent('different-call-id', { userVariables: { foreign: true } })
      );

      expect(call.userVariables).toEqual({ mine: true });

      call.destroy();
    });

    it('should accumulate multiple remote updates', async () => {
      const call = createCall(ctx, {
        callId: 'call-abc',
        userVariables: { initial: 1 }
      });

      ctx.signalingEvent$.next(
        buildWebrtcMessageEvent('call-abc', { userVariables: { second: 2 } })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      ctx.signalingEvent$.next(
        buildWebrtcMessageEvent('call-abc', { userVariables: { third: 3 } })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(call.userVariables).toEqual({ initial: 1, second: 2, third: 3 });

      call.destroy();
    });

    it('should allow remote updates to override earlier values', async () => {
      const call = createCall(ctx, {
        callId: 'call-abc',
        userVariables: { status: 'pending' }
      });

      ctx.signalingEvent$.next(
        buildWebrtcMessageEvent('call-abc', { userVariables: { status: 'active' } })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(call.userVariables).toEqual({ status: 'active' });

      call.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Inbound call userVariables passthrough
  // -------------------------------------------------------------------------

  describe('inbound call userVariables', () => {
    it('should accept userVariables from call options (as passed by ClientSessionManager)', () => {
      const inboundVars = { memberCallId: 'remote-call-id', memberId: 'remote-member-id' };
      const call = createCall(ctx, {
        initOffer: 'v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\n',
        userVariables: inboundVars
      });

      expect(call.direction).toBe('inbound');
      expect(call.userVariables).toMatchObject(inboundVars);

      call.destroy();
    });
  });
});

// ---------------------------------------------------------------------------
// fromDestinationParams (tested indirectly via Call constructor)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// toggleLock
// ---------------------------------------------------------------------------

describe('WebRTCCall - toggleLock', () => {
  let ctx: TestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
    ctx = createTestContext();
  });

  afterEach(() => {
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
  });

  it('should call "call.lock" when locked is false', async () => {
    const call = createCall(ctx);
    // locked defaults to false in our mock callEventsManager
    expect(call.locked).toBe(false);

    await call.toggleLock();

    expect(ctx.clientSession.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'call.lock'
      })
    );

    call.destroy();
  });

  it('should call "call.unlock" when locked is true', async () => {
    (ctx.callEventsManager as unknown as { locked: boolean }).locked = true;
    const call = createCall(ctx);

    expect(call.locked).toBe(true);

    await call.toggleLock();

    expect(ctx.clientSession.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'call.unlock'
      })
    );

    call.destroy();
  });

  it('should not throw after a successful RPC response', async () => {
    const call = createCall(ctx);

    await expect(call.toggleLock()).resolves.toBeUndefined();

    call.destroy();
  });

  it('should propagate errors from the RPC call', async () => {
    const rpcError = new Error('RPC failure');
    (ctx.clientSession.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(rpcError);

    const call = createCall(ctx);

    await expect(call.toggleLock()).rejects.toThrow('RPC failure');

    call.destroy();
  });
});

describe('WebRTCCall - fromDestinationParams (destination URI parsing)', () => {
  let ctx: TestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
    ctx = createTestContext();
  });

  afterEach(() => {
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
  });

  it('should extract query params from destination with ?key=value', () => {
    const call = createCall(ctx, { to: '/public/room?foo=bar&baz=qux' });

    expect(call.userVariables).toMatchObject({ foo: 'bar', baz: 'qux' });

    call.destroy();
  });

  it('should handle destination with no query params', () => {
    const call = createCall(ctx, { to: '/public/room' });

    expect(call.userVariables).toEqual({});

    call.destroy();
  });

  it('should handle undefined destination', () => {
    const call = createCall(ctx, { to: undefined });

    expect(call.userVariables).toEqual({});

    call.destroy();
  });

  it('should handle URL-encoded query values', () => {
    const call = createCall(ctx, { to: '/public/room?name=John%20Doe&emoji=%F0%9F%91%8D' });

    expect(call.userVariables).toMatchObject({ name: 'John Doe' });

    call.destroy();
  });

  it('should let options.userVariables override destination params', () => {
    const call = createCall(ctx, {
      to: '/public/room?key=fromDest',
      userVariables: { key: 'fromOptions' }
    });

    expect(call.userVariables.key).toBe('fromOptions');

    call.destroy();
  });
});

// ---------------------------------------------------------------------------
// executeMethod / buildMethodParams — RPC param shape
// ---------------------------------------------------------------------------

describe('WebRTCCall - executeMethod', () => {
  let ctx: TestContext;
  let call: WebRTCCall;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createTestContext();
    call = createCall(ctx);
  });

  afterEach(() => {
    call.destroy();
  });

  it('sends target (singular) when called with a string member_id', async () => {
    await call.executeMethod('remote-member-id', 'call.mute', { channels: ['audio'] });

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    expect(executeSpy).toHaveBeenCalledOnce();

    const request = executeSpy.mock.calls[0][0] as { params: Record<string, unknown> };
    expect(request.params).toMatchObject({
      self: {
        node_id: expect.any(String),
        call_id: 'test-call-id',
        member_id: 'test-member-id'
      },
      target: {
        node_id: expect.any(String),
        call_id: 'test-call-id',
        member_id: 'remote-member-id'
      }
    });
    expect(request.params).not.toHaveProperty('targets');
  });

  it("sends targets (array) with the member's actual call_id when called with a MemberTarget", async () => {
    const targetMember = {
      member_id: 'remote-member-id',
      call_id: 'remote-call-id',
      node_id: 'remote-node-id'
    };

    await call.executeMethod(targetMember, 'call.member.remove', {});

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    expect(executeSpy).toHaveBeenCalledOnce();

    const request = executeSpy.mock.calls[0][0] as { params: Record<string, unknown> };
    expect(request.params).toMatchObject({
      self: {
        node_id: expect.any(String),
        call_id: 'test-call-id',
        member_id: 'test-member-id'
      },
      targets: [
        {
          member_id: 'remote-member-id',
          call_id: 'remote-call-id',
          node_id: 'remote-node-id'
        }
      ]
    });
    expect(request.params).not.toHaveProperty('target');
  });

  it("does not use the caller's call_id for the target when MemberTarget is provided", async () => {
    const targetMember = {
      member_id: 'other-member',
      call_id: 'other-call-id',
      node_id: 'other-node-id'
    };

    await call.executeMethod(targetMember, 'call.member.remove', {});

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const request = executeSpy.mock.calls[0][0] as { params: { targets: { call_id: string }[] } };

    // The target's call_id must be the member's own, not the caller's 'test-call-id'
    expect(request.params.targets[0].call_id).toBe('other-call-id');
    expect(request.params.targets[0].call_id).not.toBe('test-call-id');
  });
});

// ---------------------------------------------------------------------------
// call.member.position.set — payload shape (issue #19400 item 1, Flag #5)
// ---------------------------------------------------------------------------

describe('WebRTCCall - call.member.position.set payload', () => {
  let ctx: TestContext;
  let call: WebRTCCall;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createTestContext();
    call = createCall(ctx);
  });

  afterEach(() => {
    call.destroy();
  });

  it('passes the caller-built targets[] through untouched alongside self', async () => {
    // Participant.setPosition fully builds targets[], keyed by the TARGET
    // member's own call context (#19400). The params builder must pass it
    // through unmodified and only attach `self`.
    const targets = [
      {
        target: {
          member_id: 'remote-member-id',
          call_id: 'remote-call-id',
          node_id: 'remote-node-id'
        },
        position: 'reserved-1'
      }
    ];

    await call.executeMethod('remote-member-id', 'call.member.position.set', { targets });

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const request = executeSpy.mock.calls[0][0] as { params: Record<string, unknown> };

    expect(request.params).toEqual({
      self: {
        node_id: 'test-node-id',
        call_id: 'test-call-id',
        member_id: 'test-member-id'
      },
      targets
    });
  });

  it('does not add a singular target or top-level position for position.set', async () => {
    // The DTO requires targets[] of { target, position }; the legacy singular
    // `target` and a bare `position` at the top level must NOT be present.
    const targets = [
      {
        target: {
          member_id: 'remote-member-id',
          call_id: 'remote-call-id',
          node_id: 'remote-node-id'
        },
        position: 'reserved-2'
      }
    ];

    await call.executeMethod('remote-member-id', 'call.member.position.set', { targets });

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const request = executeSpy.mock.calls[0][0] as { params: Record<string, unknown> };

    expect(request.params).not.toHaveProperty('target');
    expect(request.params).not.toHaveProperty('position');
  });
});

// ---------------------------------------------------------------------------
// setLayout — layout + positions (issue #19400 item 2, Flag #6)
// ---------------------------------------------------------------------------

describe('WebRTCCall - setLayout', () => {
  let ctx: TestContext;
  let call: WebRTCCall;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createTestContext();
    (ctx.callEventsManager as unknown as { layouts: string[] }).layouts = ['grid-responsive'];
    call = createCall(ctx);
  });

  afterEach(() => {
    call.destroy();
  });

  it('rejects a layout that is not in the available layouts', async () => {
    await expect(call.setLayout('not-a-layout', {})).rejects.toThrow();
  });

  it('sends call.layout.set WITHOUT a positions member (gateway DTO has none)', async () => {
    await call.setLayout('grid-responsive', {});

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const layoutCall = executeSpy.mock.calls.find(
      (c) => (c[0] as { method: string }).method === 'call.layout.set'
    );
    expect(layoutCall).toBeDefined();
    const request = layoutCall![0] as { params: Record<string, unknown> };
    expect(request.params).toMatchObject({ layout: 'grid-responsive' });
    expect(request.params).not.toHaveProperty('positions');
  });

  it('does not issue call.member.position.set when positions is empty', async () => {
    await call.setLayout('grid-responsive', {});

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const positionCall = executeSpy.mock.calls.find(
      (c) => (c[0] as { method: string }).method === 'call.member.position.set'
    );
    expect(positionCall).toBeUndefined();
  });

  it('changes layout when called without a positions argument', async () => {
    await call.setLayout('grid-responsive');

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const layoutCall = executeSpy.mock.calls.find(
      (c) => (c[0] as { method: string }).method === 'call.layout.set'
    );
    expect(layoutCall).toBeDefined();
    const positionCall = executeSpy.mock.calls.find(
      (c) => (c[0] as { method: string }).method === 'call.member.position.set'
    );
    expect(positionCall).toBeUndefined();
  });

  it("delegates each position to that member's own setPosition", async () => {
    // setLayout calls Participant.setPosition per member, which keys the position
    // by the member's OWN call context (matching legacy `setPositions`). #19400.
    const member1 = { id: 'member-1', setPosition: vi.fn().mockResolvedValue(undefined) };
    const member2 = { id: 'member-2', setPosition: vi.fn().mockResolvedValue(undefined) };
    (ctx.callEventsManager as unknown as { participants: unknown[] }).participants = [
      member1,
      member2
    ];

    await call.setLayout('grid-responsive', {
      'member-1': 'reserved-0',
      'member-2': 'reserved-1'
    });

    expect(member1.setPosition).toHaveBeenCalledTimes(1);
    expect(member1.setPosition).toHaveBeenCalledWith('reserved-0');
    expect(member2.setPosition).toHaveBeenCalledTimes(1);
    expect(member2.setPosition).toHaveBeenCalledWith('reserved-1');
  });

  it('skips members not present in the participant list without throwing', async () => {
    (ctx.callEventsManager as unknown as { participants: unknown[] }).participants = [];

    await expect(
      call.setLayout('grid-responsive', { 'ghost-member': 'reserved-0' })
    ).resolves.toBeUndefined();

    const executeSpy = ctx.clientSession.execute as ReturnType<typeof vi.fn>;
    const positionCall = executeSpy.mock.calls.find(
      (c) => (c[0] as { method: string }).method === 'call.member.position.set'
    );
    expect(positionCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// emitError — typed CallError, fatal handling, status transition
// ---------------------------------------------------------------------------

describe('WebRTCCall - emitError', () => {
  let ctx: TestContext;
  let call: WebRTCCall;

  beforeEach(() => {
    vi.clearAllMocks();
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
    ctx = createTestContext();
    call = createCall(ctx);
  });

  afterEach(() => {
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
  });

  it('emits the CallError on errors$', async () => {
    const errors: import('../../errors').CallError[] = [];
    const sub = call.errors$.subscribe((e) => errors.push(e));

    const err = new Error('rpc failure');
    call.emitError({ kind: 'signaling', fatal: false, error: err, callId: call.id });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ kind: 'signaling', fatal: false, error: err });

    sub.unsubscribe();
    call.destroy();
  });

  it('non-fatal error does NOT change call status', () => {
    const statuses: string[] = [];
    const sub = call.status$.subscribe((s) => statuses.push(s));

    call.emitError({ kind: 'signaling', fatal: false, error: new Error('minor'), callId: call.id });

    // Status should still be 'new' (initial), not 'failed'
    expect(call.status).toBe('new');

    sub.unsubscribe();
    call.destroy();
  });

  it('fatal error transitions status to failed then destroyed', async () => {
    const statuses: string[] = [];
    const sub = call.status$.subscribe((s) => statuses.push(s));

    call.emitError({
      kind: 'signaling',
      fatal: true,
      error: new Error('fatal rpc'),
      callId: call.id
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(statuses).toContain('failed');
    expect(statuses).toContain('destroyed');

    sub.unsubscribe();
  });

  it('fatal error calls vertoManager.destroy', () => {
    call.emitError({ kind: 'media', fatal: true, error: new Error('media fail'), callId: call.id });

    expect(ctx.vertoManager.destroy).toHaveBeenCalled();
  });

  it('emitError on an already-destroyed call is a no-op', () => {
    const errors: import('../../errors').CallError[] = [];
    call.errors$.subscribe((e) => errors.push(e));

    call.destroy();

    // Should not throw or emit after destruction
    call.emitError({ kind: 'internal', fatal: true, error: new Error('late'), callId: call.id });

    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Resilience subsystems
// ---------------------------------------------------------------------------

function createMockStatsReport(
  overrides?: Partial<{
    audioPacketsReceived: number;
    audioPacketsLost: number;
    audioJitter: number;
    videoPacketsReceived: number;
    videoPacketsLost: number;
    rtt: number;
    bitrate: number;
  }>
): RTCStatsReport {
  const defaults = {
    audioPacketsReceived: 100,
    audioPacketsLost: 0,
    audioJitter: 0.005,
    videoPacketsReceived: 50,
    videoPacketsLost: 0,
    rtt: 0.025,
    bitrate: 2500000,
    ...overrides
  };

  const entries = new Map<string, Record<string, unknown>>();
  entries.set('inbound-rtp-audio', {
    type: 'inbound-rtp',
    kind: 'audio',
    packetsReceived: defaults.audioPacketsReceived,
    packetsLost: defaults.audioPacketsLost,
    jitter: defaults.audioJitter
  });
  entries.set('inbound-rtp-video', {
    type: 'inbound-rtp',
    kind: 'video',
    packetsReceived: defaults.videoPacketsReceived,
    packetsLost: defaults.videoPacketsLost
  });
  entries.set('candidate-pair-1', {
    type: 'candidate-pair',
    state: 'succeeded',
    currentRoundTripTime: defaults.rtt,
    availableOutgoingBitrate: defaults.bitrate
  });

  return entries as unknown as RTCStatsReport;
}

function createMockPeerConnection(statsReport?: RTCStatsReport) {
  return {
    getStats: vi.fn().mockResolvedValue(statsReport ?? createMockStatsReport()),
    connectionState: 'connected',
    getReceivers: vi.fn().mockReturnValue([]),
    getSenders: vi.fn().mockReturnValue([])
  } as unknown as RTCPeerConnection;
}

describe('WebRTCCall - resilience subsystems', () => {
  let ctx: TestContext;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
    ctx = createTestContext();
  });

  afterEach(() => {
    vi.useRealTimers();
    (PreferencesContainer.instance as { userVariables: Record<string, unknown> }).userVariables =
      {};
  });

  /**
   * Helper: set up a mock peer connection on the vertoManager so
   * initResilienceSubsystems can find it via call.rtcPeerConnection.
   */
  function attachPeerConnection(statsReport?: RTCStatsReport): void {
    (
      ctx.vertoManager.mainPeerConnection as { peerConnection: RTCPeerConnection | undefined }
    ).peerConnection = createMockPeerConnection(statsReport);
  }

  /**
   * Helper: emit 'connected' on signalingStatus$ and flush microtasks so
   * the merge subscription inside the constructor fires synchronously.
   */
  async function simulateConnected(): Promise<void> {
    (ctx.vertoManager.signalingStatus$ as Subject<string>).next('connected');
    await vi.advanceTimersByTimeAsync(0);
  }

  /**
   * Helper: emit 'disconnected' on signalingStatus$ and flush microtasks.
   */
  async function simulateDisconnected(): Promise<void> {
    (ctx.vertoManager.signalingStatus$ as Subject<string>).next('disconnected');
    await vi.advanceTimersByTimeAsync(0);
  }

  // -------------------------------------------------------------------------
  // 1. Stats monitor starts on 'connected'
  // -------------------------------------------------------------------------

  it('should start emitting networkMetrics after status reaches connected', async () => {
    attachPeerConnection();
    const call = createCall(ctx);

    const metrics: unknown[][] = [];
    const sub = call.networkMetrics$.subscribe((m) => metrics.push(m));
    await vi.advanceTimersByTimeAsync(0);

    // Before 'connected' we only have the initial empty array
    expect(metrics.length).toBeGreaterThanOrEqual(1);
    expect(metrics[metrics.length - 1]).toEqual([]);

    await simulateConnected();

    // Advance past one polling interval (1000ms) + flush the async getStats
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);

    // Should have received non-empty metrics
    const last = metrics[metrics.length - 1];
    expect(last.length).toBeGreaterThan(0);

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 2. Quality score computed from metrics
  // -------------------------------------------------------------------------

  it('should emit qualityScore between 1 and 5, and a valid qualityLevel', async () => {
    attachPeerConnection();
    const call = createCall(ctx);

    const scores: number[] = [];
    const levels: string[] = [];
    const subScore = call.qualityScore$.subscribe((s) => scores.push(s));
    const subLevel = call.qualityLevel$.subscribe((l) => levels.push(l));
    await vi.advanceTimersByTimeAsync(0);

    await simulateConnected();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);

    const lastScore = scores[scores.length - 1];
    expect(lastScore).toBeGreaterThanOrEqual(1);
    expect(lastScore).toBeLessThanOrEqual(5);

    const validLevels = ['excellent', 'good', 'fair', 'poor', 'critical'];
    const lastLevel = levels[levels.length - 1];
    expect(validLevels).toContain(lastLevel);

    subScore.unsubscribe();
    subLevel.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 3. Subscribers before 'connected' receive data
  // -------------------------------------------------------------------------

  it('should deliver metrics to subscribers that attached before connected', async () => {
    attachPeerConnection();
    const call = createCall(ctx);

    // Subscribe BEFORE the call connects
    const metrics: unknown[][] = [];
    const sub = call.networkMetrics$.subscribe((m) => metrics.push(m));
    await vi.advanceTimersByTimeAsync(0);

    // Now connect
    await simulateConnected();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);

    // The pre-connected subscriber should have received non-empty metrics
    const last = metrics[metrics.length - 1];
    expect(last.length).toBeGreaterThan(0);

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 4. Network health reflects issues
  // -------------------------------------------------------------------------

  it('should report unhealthy network when no inbound audio packets for >2s', async () => {
    // Stats with zero audio packets — the monitor will see no change across polls
    const zeroAudioStats = createMockStatsReport({
      audioPacketsReceived: 0,
      videoPacketsReceived: 0
    });
    attachPeerConnection(zeroAudioStats);
    const call = createCall(ctx);

    const healthValues: boolean[] = [];
    const sub = call.isNetworkHealthy$.subscribe((h) => healthValues.push(h));
    await vi.advanceTimersByTimeAsync(0);

    await simulateConnected();

    // Advance past the noAudioPacketThresholdMs (2000ms by default).
    // The monitor polls every 1000ms, so we need 3 polls to exceed 2s.
    for (let i = 0; i < 4; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(0);
    }

    // isNetworkHealthy should have emitted false at some point
    expect(healthValues).toContain(false);
    expect(call.isNetworkHealthy).toBe(false);

    // networkIssues should contain at least one issue
    expect(call.networkIssues.length).toBeGreaterThan(0);
    const audioIssue = call.networkIssues.find((i) => i.type === 'no_inbound_audio');
    expect(audioIssue).toBeDefined();

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 5. Recovery state starts at idle
  // -------------------------------------------------------------------------

  it('should have recoveryState starting at idle', async () => {
    const call = createCall(ctx);

    const states: string[] = [];
    const sub = call.recoveryState$.subscribe((s) => states.push(s));
    await vi.advanceTimersByTimeAsync(0);

    expect(states).toContain('idle');

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 6. requestKeyframe delegates to vertoManager
  // -------------------------------------------------------------------------

  it('should delegate requestKeyframe to vertoManager', () => {
    (ctx.vertoManager as unknown as { requestKeyframe: ReturnType<typeof vi.fn> }).requestKeyframe =
      vi.fn();
    const call = createCall(ctx);

    call.requestKeyframe();

    expect(ctx.vertoManager.requestKeyframe).toHaveBeenCalled();

    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 7. requestIceRestart delegates to vertoManager
  // -------------------------------------------------------------------------

  it('should delegate requestIceRestart to vertoManager', async () => {
    (
      ctx.vertoManager as unknown as { requestIceRestart: ReturnType<typeof vi.fn> }
    ).requestIceRestart = vi.fn().mockResolvedValue(undefined);
    const call = createCall(ctx);

    await call.requestIceRestart();

    expect(ctx.vertoManager.requestIceRestart).toHaveBeenCalled();

    call.destroy();
  });

  // -------------------------------------------------------------------------
  // 8. Cleanup on disconnect — stats stop after disconnected
  // -------------------------------------------------------------------------

  it('should stop emitting metrics after disconnect', async () => {
    attachPeerConnection();
    const call = createCall(ctx);

    const metrics: unknown[][] = [];
    const sub = call.networkMetrics$.subscribe((m) => metrics.push(m));
    await vi.advanceTimersByTimeAsync(0);

    // Connect and let one poll happen
    await simulateConnected();
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);

    const countAfterFirstPoll = metrics.length;
    expect(countAfterFirstPoll).toBeGreaterThan(1);

    // Disconnect
    await simulateDisconnected();
    await vi.advanceTimersByTimeAsync(0);

    const countAfterDisconnect = metrics.length;

    // Advance several more polling intervals — no new metrics should arrive
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(0);

    expect(metrics.length).toBe(countAfterDisconnect);

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // relayOnly ICE restart passthrough
  // -------------------------------------------------------------------------

  it('should pass relayOnly to vertoManager.requestIceRestartAll', async () => {
    attachPeerConnection();

    // Add requestIceRestartAll mock to verify relayOnly is passed through
    const iceRestartAllMock = vi.fn().mockResolvedValue(undefined);
    (ctx.vertoManager as Record<string, unknown>).requestIceRestartAll = iceRestartAllMock;

    const call = createCall(ctx);
    await simulateConnected();

    // Access the recovery manager's callbacks via the internal reference
    const recoveryManager = (
      call as unknown as {
        _recoveryManager: {
          _callbacks: { requestIceRestart: (relayOnly?: boolean) => Promise<boolean> };
        };
      }
    )._recoveryManager;
    expect(recoveryManager).toBeDefined();

    // Call with relayOnly=true (Tier 3)
    await recoveryManager._callbacks.requestIceRestart(true);
    expect(iceRestartAllMock).toHaveBeenCalledWith(true);

    // Call without relayOnly (Tier 2)
    iceRestartAllMock.mockClear();
    await recoveryManager._callbacks.requestIceRestart();
    expect(iceRestartAllMock).toHaveBeenCalledWith(undefined);

    call.destroy();
  });

  // -------------------------------------------------------------------------
  // WebSocket reconnect notification
  // -------------------------------------------------------------------------

  it('should call handleWebSocketReconnect when authenticated$ re-emits true', async () => {
    attachPeerConnection();
    const call = createCall(ctx);
    await simulateConnected();

    const recoveryManager = (
      call as unknown as { _recoveryManager: { handleWebSocketReconnect: () => void } }
    )._recoveryManager;
    expect(recoveryManager).toBeDefined();

    const handleReconnectSpy = vi.spyOn(recoveryManager, 'handleWebSocketReconnect');

    // First emit was during construction (skip(1) skips it).
    // Second emit simulates WebSocket re-authentication after a drop.
    (ctx.clientSession.authenticated$ as BehaviorSubject<boolean>).next(false);
    (ctx.clientSession.authenticated$ as BehaviorSubject<boolean>).next(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(handleReconnectSpy).toHaveBeenCalledTimes(1);

    handleReconnectSpy.mockRestore();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // NetworkMonitor integration
  // -------------------------------------------------------------------------

  it('should push recovery trigger when networkChange$ emits offline', async () => {
    const networkChange$ = new Subject<{ type: string; timestamp: number; networkType?: string }>();

    // Create context with networkChange$ in initialization
    ctx.initialization = {
      ...ctx.initialization,
      networkChange$: networkChange$ as unknown as import('rxjs').Observable<
        import('../../controllers/NetworkMonitor').NetworkChangeEvent
      >
    };

    attachPeerConnection();
    const call = createCall(ctx);
    await simulateConnected();

    const recoveryManager = (
      call as unknown as { _recoveryManager: { pushTrigger: (t: unknown) => void } }
    )._recoveryManager;
    expect(recoveryManager).toBeDefined();

    const pushTriggerSpy = vi.spyOn(recoveryManager, 'pushTrigger');

    networkChange$.next({ type: 'offline', timestamp: Date.now() });
    await vi.advanceTimersByTimeAsync(0);

    expect(pushTriggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'network', detail: 'browser went offline' })
    );

    pushTriggerSpy.mockRestore();
    call.destroy();
  });

  it('should call handleWebSocketReconnect when networkChange$ emits online', async () => {
    const networkChange$ = new Subject<{ type: string; timestamp: number; networkType?: string }>();

    ctx.initialization = {
      ...ctx.initialization,
      networkChange$: networkChange$ as unknown as import('rxjs').Observable<
        import('../../controllers/NetworkMonitor').NetworkChangeEvent
      >
    };

    attachPeerConnection();
    const call = createCall(ctx);
    await simulateConnected();

    const recoveryManager = (
      call as unknown as { _recoveryManager: { handleWebSocketReconnect: () => void } }
    )._recoveryManager;
    expect(recoveryManager).toBeDefined();

    const handleReconnectSpy = vi.spyOn(recoveryManager, 'handleWebSocketReconnect');

    networkChange$.next({ type: 'online', timestamp: Date.now() });
    await vi.advanceTimersByTimeAsync(0);

    expect(handleReconnectSpy).toHaveBeenCalledTimes(1);

    handleReconnectSpy.mockRestore();
    call.destroy();
  });
});
