import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject, firstValueFrom, toArray, takeUntil } from 'rxjs';

import { PreferencesContainer } from '../../containers/PreferencesContainer';
import { WebRTCCall } from './Call';

import type { ClientSession } from '../../interfaces/ClientSession';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { WebRTCVerto } from '../../interfaces/WebRTCVerto';
import type { CallEventsManager } from '../../managers/CallEventsManager';
import type { CallInitialization, CallManagers } from './Call';
import type { CallOptions } from './types/call.types';

// ---------------------------------------------------------------------------
// Mock factories (same pattern as Call.test.ts)
// ---------------------------------------------------------------------------

function createMockClientSession(
  signalingEvent$?: Subject<Record<string, unknown>>
): ClientSession {
  return {
    signalingEvent$: signalingEvent$ ?? new Subject<Record<string, unknown>>(),
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
    isCallIdValid: vi.fn().mockReturnValue(true),
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
 * Build an event that matches what `callSessionEvents$` receives.
 *
 * ClientSessionManager.signalingEvent$ applies `filterAs(isSignalwireRequest, 'params')`
 * so it extracts the `params` from the raw `signalwire.event` JSONRPC message.
 * The result has `event_type` at the top level and `call_id` inside `params`.
 *
 * `isCallSessionEvent` then looks at `params.params.callID` or `params.call_id`.
 * Since we're already inside the extracted params, the check becomes
 * `event.params.call_id` (which matches the second path).
 */
function buildSignalwireEvent(
  callId: string,
  eventType: string,
  extraParams: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    event_type: eventType,
    event_channel: 'test-channel',
    timestamp: Date.now(),
    project_id: 'test-project',
    node_id: 'test-node',
    params: {
      call_id: callId,
      ...extraParams
    }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCCall - subscribe (custom event subscriptions)', () => {
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

  it('should return a filtered observable for the given event type', async () => {
    const call = createCall(ctx);
    const stop$ = new Subject<void>();
    const collected: Record<string, unknown>[] = [];

    call
      .subscribe('my.custom.event')
      .pipe(takeUntil(stop$))
      .subscribe((event) => {
        collected.push(event);
      });

    // Emit a matching event
    ctx.signalingEvent$.next(
      buildSignalwireEvent('test-call-id', 'my.custom.event', { data: 'hello' })
    );

    // Emit a non-matching event
    ctx.signalingEvent$.next(
      buildSignalwireEvent('test-call-id', 'other.event', { data: 'world' })
    );

    // Give async scheduler time to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    stop$.next();
    stop$.complete();

    expect(collected.length).toBe(1);
    expect(collected[0]).toMatchObject({ event_type: 'my.custom.event' });

    call.destroy();
  });

  it('should cache by event type (return same observable for same type)', () => {
    const call = createCall(ctx);

    const obs1 = call.subscribe('my.event');
    const obs2 = call.subscribe('my.event');

    expect(obs1).toBe(obs2);

    call.destroy();
  });

  it('should return different observables for different event types', () => {
    const call = createCall(ctx);

    const obs1 = call.subscribe('event.a');
    const obs2 = call.subscribe('event.b');

    expect(obs1).not.toBe(obs2);

    call.destroy();
  });

  it('should complete when the call is destroyed', async () => {
    const call = createCall(ctx);
    let completed = false;

    call.subscribe('my.event').subscribe({
      complete: () => {
        completed = true;
      }
    });

    call.destroy();

    // Give time for completion
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(completed).toBe(true);
  });

  it('should not emit events from other calls', async () => {
    // Override isCallIdValid to return false for unknown call IDs
    const evtManager = createMockCallEventsManager();
    (evtManager.isCallIdValid as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const ctx2: TestContext = {
      ...ctx,
      callEventsManager: evtManager,
      initialization: {
        initializeManagers: vi.fn().mockReturnValue({
          vertoManager: ctx.vertoManager,
          callEventsManager: evtManager
        }),
        deviceController: ctx.deviceController
      }
    };

    const call = createCall(ctx2);
    const stop$ = new Subject<void>();
    const collected: Record<string, unknown>[] = [];

    call
      .subscribe('my.event')
      .pipe(takeUntil(stop$))
      .subscribe((event) => {
        collected.push(event);
      });

    // Emit an event for a different call ID
    ctx.signalingEvent$.next(
      buildSignalwireEvent('different-call-id', 'my.event', { data: 'other' })
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    stop$.next();
    stop$.complete();

    // Event should have been filtered out by the callSessionEvents$ filter
    expect(collected.length).toBe(0);

    call.destroy();
  });
});
