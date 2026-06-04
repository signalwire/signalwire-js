import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RemoteAudioMeter } from '../../controllers/RemoteAudioMeter';
import { WebRTCCall } from './Call';

import type { ClientSession } from '../../interfaces/ClientSession';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { WebRTCVerto } from '../../interfaces/WebRTCVerto';
import type { CallEventsManager } from '../../managers/CallEventsManager';
import type { CallInitialization, CallManagers } from './Call';
import type { CallOptions } from './types/call.types';

// ---------------------------------------------------------------------------
// Mock RemoteAudioMeter — instantiating the real one creates an AudioContext,
// which happy-dom doesn't provide. The per-test mock is configured in
// `beforeEach` so each test gets a fresh setStream spy and level$ subject.
// ---------------------------------------------------------------------------

vi.mock('../../controllers/RemoteAudioMeter', () => ({
  RemoteAudioMeter: vi.fn()
}));

interface RemoteMeterMock {
  setStream: ReturnType<typeof vi.fn>;
  level$: Subject<number>;
  destroy: ReturnType<typeof vi.fn>;
  instanceCount: number;
}

let remoteMeterMock: RemoteMeterMock;

// ---------------------------------------------------------------------------
// Mock factories — minimal subset needed to instantiate WebRTCCall
// ---------------------------------------------------------------------------

interface FakePipeline {
  gain$: BehaviorSubject<number>;
  level$: Observable<number>;
  speaking$: Observable<boolean>;
}

function createFakePipeline(overrides: Partial<FakePipeline> = {}): FakePipeline {
  return {
    gain$: new BehaviorSubject<number>(1),
    level$: new Subject<number>().asObservable(),
    speaking$: new Subject<boolean>().asObservable(),
    ...overrides
  };
}

function createMockClientSession(): ClientSession {
  return {
    signalingEvent$: new Subject<Record<string, unknown>>(),
    authenticated$: new BehaviorSubject<boolean>(true),
    iceServers: undefined,
    execute: vi.fn().mockResolvedValue({ id: 1, result: {} })
  } as unknown as ClientSession;
}

interface MockVertoManager extends WebRTCVerto {
  remoteStream$: BehaviorSubject<MediaStream | null>;
  ensureLocalAudioPipeline: ReturnType<typeof vi.fn>;
  localAudioPipeline: FakePipeline | null;
}

function createMockVertoManager(pipeline: FakePipeline | null = null): MockVertoManager {
  const ensureLocalAudioPipeline = vi.fn(() => pipeline);
  return {
    selfId$: new BehaviorSubject<string | null>('test-member-id'),
    selfId: 'test-member-id',
    nodeId$: new BehaviorSubject<string | null>('test-node-id'),
    nodeId: 'test-node-id',
    localStream$: new BehaviorSubject<MediaStream>(new MediaStream()),
    localStream: new MediaStream(),
    remoteStream$: new BehaviorSubject<MediaStream | null>(new MediaStream()),
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
    transfer: vi.fn().mockResolvedValue(undefined),
    ensureLocalAudioPipeline,
    localAudioPipeline: pipeline
  } as unknown as MockVertoManager;
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

function createCall(vertoManager: MockVertoManager): WebRTCCall {
  const initialization: CallInitialization = {
    initializeManagers: vi.fn().mockReturnValue({
      vertoManager,
      callEventsManager: createMockCallEventsManager()
    } satisfies CallManagers),
    deviceController: createMockDeviceController()
  };
  const options: CallOptions = { callId: 'test-call-id', to: '/public/test-room' };
  return new WebRTCCall(createMockClientSession(), options, initialization);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCCall — audio-level observable caching', () => {
  beforeEach(() => {
    remoteMeterMock = {
      setStream: vi.fn(),
      level$: new Subject<number>(),
      destroy: vi.fn(),
      instanceCount: 0
    };
    vi.mocked(RemoteAudioMeter).mockImplementation(function MockRemoteAudioMeter(
      this: Record<string, unknown>
    ) {
      remoteMeterMock.instanceCount += 1;
      this.setStream = remoteMeterMock.setStream;
      this.level$ = remoteMeterMock.level$.asObservable();
      this.destroy = remoteMeterMock.destroy;
    } as unknown as () => RemoteAudioMeter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // remoteAudioLevel$ — the headline leak fix
  // -------------------------------------------------------------------------

  it('remoteAudioLevel$: reading the getter N times installs only one remoteStream$ subscription', () => {
    const verto = createMockVertoManager();
    const call = createCall(verto);

    // Read the getter 5 times before anyone subscribes. Without the fix each
    // read registered a fresh subscribeTo(remoteStream$, meter.setStream).
    for (let i = 0; i < 5; i += 1) {
      void call.remoteAudioLevel$;
    }

    // Baseline: the BehaviorSubject replayed once per subscription install,
    // so the pre-fix version would be 5. With caching it's 1.
    remoteMeterMock.setStream.mockClear();

    const newStream = new MediaStream();
    verto.remoteStream$.next(newStream);

    expect(remoteMeterMock.setStream).toHaveBeenCalledTimes(1);
    expect(remoteMeterMock.setStream).toHaveBeenCalledWith(newStream);

    call.destroy();
  });

  it('remoteAudioLevel$: returns the same Observable reference across reads', () => {
    const call = createCall(createMockVertoManager());

    expect(call.remoteAudioLevel$).toBe(call.remoteAudioLevel$);

    call.destroy();
  });

  it('remoteAudioLevel$: constructs the RemoteAudioMeter exactly once', () => {
    const verto = createMockVertoManager();
    const call = createCall(verto);

    for (let i = 0; i < 3; i += 1) {
      void call.remoteAudioLevel$;
    }

    expect(remoteMeterMock.instanceCount).toBe(1);

    call.destroy();
  });

  // -------------------------------------------------------------------------
  // local*$ — share() collapses N subscribers to 1 upstream subscription
  // -------------------------------------------------------------------------

  it('localAudioLevel$: N subscribers produce one upstream subscription (share)', () => {
    let levelSubscribeCount = 0;
    const level$ = new Observable<number>(() => {
      levelSubscribeCount += 1;
      return () => {
        /* no-op teardown */
      };
    });
    const pipeline = createFakePipeline({ level$ });
    const call = createCall(createMockVertoManager(pipeline));

    const obs = call.localAudioLevel$;
    const s1 = obs.subscribe();
    const s2 = obs.subscribe();
    const s3 = obs.subscribe();

    expect(levelSubscribeCount).toBe(1);

    s1.unsubscribe();
    s2.unsubscribe();
    s3.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // Uncached fallback contract — pre-negotiation consumers upgrade when ready
  // -------------------------------------------------------------------------

  it('localAudioLevel$: null-pipeline fallback is uncached and upgrades once the pipeline is ready', async () => {
    const pipelineLevel$ = new Subject<number>();
    const pipeline = createFakePipeline({ level$: pipelineLevel$.asObservable() });

    const verto = createMockVertoManager(null);
    // First call: no pipeline yet. Subsequent calls: pipeline available.
    (verto.ensureLocalAudioPipeline as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(null)
      .mockReturnValue(pipeline);

    const call = createCall(verto);

    const pre = call.localAudioLevel$; // null pipeline → of(0), uncached
    const post = call.localAudioLevel$; // pipeline exists → cached live observable

    expect(pre).not.toBe(post);
    await expect(firstValueFrom(pre)).resolves.toBe(0);

    // The live observable tracks pipeline.level$ emissions. publicCachedObservable
    // wraps the source with observeOn(asapScheduler), so emissions are deferred
    // to the microtask queue — flush before asserting.
    const emissions: number[] = [];
    const sub = post.subscribe((value) => emissions.push(value));
    pipelineLevel$.next(0.42);
    await Promise.resolve();

    expect(emissions).toEqual([0.42]);

    sub.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // localMicrophoneGain$ — BehaviorSubject replay must reach late subscribers
  // -------------------------------------------------------------------------

  it('localMicrophoneGain$: concurrent subscribers both receive the current gain on subscribe', async () => {
    const gain$ = new BehaviorSubject<number>(0.75);
    const pipeline = createFakePipeline({ gain$ });
    const call = createCall(createMockVertoManager(pipeline));

    const obs = call.localMicrophoneGain$;

    const firstEmissions: number[] = [];
    const secondEmissions: number[] = [];

    // First subscriber. publicCachedObservable wraps emissions with
    // observeOn(asapScheduler); flush the microtask queue before asserting.
    const s1 = obs.subscribe((value) => firstEmissions.push(value));
    await Promise.resolve();
    expect(firstEmissions).toEqual([75]);

    // Late subscriber must also see the BehaviorSubject's current value —
    // this is the regression guard for share() trampling BehaviorSubject
    // replay semantics on gain$.
    const s2 = obs.subscribe((value) => secondEmissions.push(value));
    await Promise.resolve();
    expect(secondEmissions).toEqual([75]);

    // Both subscribers continue to see future setGain() updates.
    gain$.next(1.5);
    await Promise.resolve();
    expect(firstEmissions).toEqual([75, 150]);
    expect(secondEmissions).toEqual([75, 150]);

    s1.unsubscribe();
    s2.unsubscribe();
    call.destroy();
  });

  // -------------------------------------------------------------------------
  // Destroy path — teardown reaches the shared upstream subscription
  // -------------------------------------------------------------------------

  it('remoteAudioLevel$: post-destroy emissions on remoteStream$ do not reach setStream', () => {
    const verto = createMockVertoManager();
    const call = createCall(verto);

    // Prime the cache so the subscribeTo(remoteStream$, …) is installed.
    void call.remoteAudioLevel$;
    remoteMeterMock.setStream.mockClear();

    call.destroy();

    verto.remoteStream$.next(new MediaStream());

    expect(remoteMeterMock.setStream).not.toHaveBeenCalled();
  });
});
