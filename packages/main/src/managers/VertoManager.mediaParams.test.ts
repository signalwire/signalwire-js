import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { MockMediaStream, MockMediaStreamTrack, MockRTCPeerConnection } from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { WebRTCCall } from '../core/entities/Call';
import type { MediaParamsEvent } from '../core/types/resilience.types';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * `mediaParamsUpdated.applied` has to mean what it says.
 *
 * The server pushes media params for a leg the call holds and the SDK reports
 * them whether or not they could be applied. `applied` is how
 * it tells a push that reached the wire from one that could not: media the SDK
 * did not capture is left alone, and a browser can refuse the constraints
 * outright. Both were reported as `applied: true`, which is indistinguishable
 * from success.
 */

const createMockDeviceController = (): DeviceController =>
  ({
    selectedAudioInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedVideoInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn(() => ({}))
  }) as unknown as DeviceController;

const createMockAttachManager = (): AttachManager =>
  ({
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined)
  }) as unknown as AttachManager;

const createMockCallSession = (
  options: Record<string, unknown>,
  emitMediaParamsUpdated: ReturnType<typeof vi.fn>
): WebRTCCall =>
  ({
    id: 'main-call-id',
    to: '/public/test-room',
    from: 'caller',
    userVariables: {},
    options,
    clientSession: { iceServers: [] },
    webrtcMessages$: new Subject(),
    callEvent$: new Subject(),
    answered$: new Subject(),
    mediaDirections: { audio: 'sendrecv', video: 'inactive' },
    execute: vi.fn(() => new Promise(() => {})),
    addCallId: vi.fn(),
    emitMediaParamsUpdated,
    destroy: vi.fn()
  }) as unknown as WebRTCCall;

interface Fixture {
  vertoManager: WebRTCVertoManager;
  callSession: WebRTCCall;
  emitMediaParamsUpdated: ReturnType<typeof vi.fn>;
  pcInstances: MockRTCPeerConnection[];
}

const createFixture = (options: Record<string, unknown>, audioTrack?: MockMediaStreamTrack): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const MockPeerConnectionConstructor = vi.fn(function (this: unknown, config?: RTCConfiguration) {
    const pc = new MockRTCPeerConnection(config);
    pcInstances.push(pc);
    return pc as unknown as RTCPeerConnection;
  });

  const getUserMedia = vi.fn(
    async () =>
      new MockMediaStream([
        audioTrack ?? new MockMediaStreamTrack('audio')
      ]) as unknown as MediaStream
  );

  const webRTCApiProvider = {
    RTCPeerConnection: MockPeerConnectionConstructor as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia,
      getDisplayMedia: vi.fn(),
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const emitMediaParamsUpdated = vi.fn();
  const callSession = createMockCallSession(options, emitMediaParamsUpdated);

  const vertoManager = new WebRTCVertoManager(
    callSession,
    createMockAttachManager(),
    createMockDeviceController(),
    webRTCApiProvider,
    { onError: vi.fn() }
  );

  return { vertoManager, callSession, emitMediaParamsUpdated, pcInstances };
};

/** Poll until `predicate` is true (real timers). */
const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const pushMediaParams = (fixture: Fixture, mediaParams: Record<string, unknown>): void => {
  (fixture.callSession.webrtcMessages$ as unknown as { next: (value: unknown) => void }).next({
    jsonrpc: '2.0',
    method: 'verto.mediaParams',
    params: { callID: 'main-call-id', mediaParams }
  });
};

const lastEvent = (fixture: Fixture): MediaParamsEvent =>
  fixture.emitMediaParamsUpdated.mock.calls.at(-1)?.[0] as MediaParamsEvent;

describe('VertoManager - mediaParamsUpdated.applied reflects what happened', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  it('reports applied when a device capture takes the constraints', async () => {
    fixture = createFixture({ audio: true, receiveAudio: true });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    pushMediaParams(fixture, { audio: { echoCancellation: false } });
    await waitFor(() => fixture.emitMediaParamsUpdated.mock.calls.length > 0);

    expect(lastEvent(fixture).applied).toBe(true);
  });

  it('reports not applied when the sender carries media the SDK did not capture', async () => {
    // #20524: a supplied track's synthetic deviceId is unsatisfiable and its
    // processing flags throw, so the SDK leaves it alone — and must say so.
    const supplied = new MockMediaStreamTrack('audio', 'supplied-audio');
    fixture = createFixture({
      audio: false,
      video: false,
      receiveAudio: true,
      inputAudioStream: new MockMediaStream([supplied]) as unknown as MediaStream
    });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    pushMediaParams(fixture, { audio: { echoCancellation: false } });
    await waitFor(() => fixture.emitMediaParamsUpdated.mock.calls.length > 0);

    expect(lastEvent(fixture).applied).toBe(false);
  });

  it('still reports the params the server asked for when they were not applied', async () => {
    const supplied = new MockMediaStreamTrack('audio', 'supplied-audio');
    fixture = createFixture({
      audio: false,
      video: false,
      receiveAudio: true,
      inputAudioStream: new MockMediaStream([supplied]) as unknown as MediaStream
    });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    pushMediaParams(fixture, { audio: { echoCancellation: false, noiseSuppression: false } });
    await waitFor(() => fixture.emitMediaParamsUpdated.mock.calls.length > 0);

    expect(lastEvent(fixture).audio).toEqual({ echoCancellation: false, noiseSuppression: false });
  });

  it('reports not applied when the leg has no sender of that kind', async () => {
    fixture = createFixture({ audio: false, video: false, receiveAudio: true });

    pushMediaParams(fixture, { audio: { echoCancellation: false } });
    await waitFor(() => fixture.emitMediaParamsUpdated.mock.calls.length > 0);

    expect(lastEvent(fixture).applied).toBe(false);
  });

  it('reports not applied when only one of the two kinds could be applied', async () => {
    // The kinds are applied independently, so the flag has to cover both.
    fixture = createFixture({ audio: true, receiveAudio: true });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    pushMediaParams(fixture, {
      audio: { echoCancellation: false },
      video: { width: 1920 }
    });
    await waitFor(() => fixture.emitMediaParamsUpdated.mock.calls.length > 0);

    expect(lastEvent(fixture).applied, 'no video sender exists to constrain').toBe(false);
  });
});
