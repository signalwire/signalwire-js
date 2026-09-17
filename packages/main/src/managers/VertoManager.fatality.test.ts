import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { MockRTCPeerConnection } from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * A verto.info failure must NEVER be fatal.
 *
 * verto.info carries best-effort in-dialog frames — DTMF (sendDigits) and member control
 * (sendCallControl). A rejection means "that op did not happen", never "the call is dead";
 * the authoritative death signals are verto.bye and call.state. This matters because
 * CallFactory's onError wiring falls back to isFatalError(), which classifies a
 * JSONRPCError as fatal, and Call.emitError then marks the call failed, sends bye and
 * destroys it — so without the non-fatal flag a rejected mute or DTMF digit would tear
 * down the whole call.
 *
 * Both error shapes are covered, because they take different paths: a JSONRPC `error`
 * (top-level or nested at result.result) is detected by executeVerto, while a verto-style
 * `{ code }` buried in nested `.result` envelopes is only seen by sendCallControl's
 * findNestedVertoFailure. The last test pins the other direction: signaling-critical
 * frames keep the default (fatal) classification.
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

const createMockCallSession = (execute: ReturnType<typeof vi.fn>): WebRTCCall =>
  ({
    id: 'main-call-id',
    to: '/public/test-room',
    options: { audio: false, video: false, receiveAudio: true },
    clientSession: { iceServers: [] },
    webrtcMessages$: new Subject(),
    callEvent$: new Subject(),
    answered$: new Subject(),
    mediaDirections: { audio: 'inactive', video: 'inactive' },
    execute,
    addCallId: vi.fn(),
    emitMediaParamsUpdated: vi.fn(),
    destroy: vi.fn()
  }) as unknown as WebRTCCall;

function createFixture(executeImpl: () => Promise<unknown>) {
  const execute = vi.fn(executeImpl);
  const callSession = createMockCallSession(execute);
  const onError = vi.fn();
  const webRTCApiProvider = {
    RTCPeerConnection: vi.fn(function (this: unknown, config?: RTCConfiguration) {
      return new MockRTCPeerConnection(config) as unknown as RTCPeerConnection;
    }) as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia: vi.fn(),
      getDisplayMedia: vi.fn(),
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const vertoManager = new WebRTCVertoManager(
    callSession,
    createMockAttachManager(),
    createMockDeviceController(),
    webRTCApiProvider,
    { onError }
  );

  return { vertoManager, callSession, onError, execute };
}

/** The non-fatal marker executeVerto must pass for verto.info. */
const NON_FATAL = { fatal: false };
/** Leg identity travels with every leg-scoped error report; see reportLegError. */
const MAIN_LEG = { leg: 'main', legId: 'main-call-id' };

describe('VertoManager - verto.info failures are never fatal', () => {
  let fixture: ReturnType<typeof createFixture>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
  });

  it('sendCallControl: a top-level JSONRPC error is reported non-fatally', async () => {
    fixture = createFixture(async () => ({
      id: 1,
      error: { code: -32001, message: 'no such call' }
    }));

    // The op REJECTS (findNestedVertoFailure surfaces the JSONRPC error shape) and the
    // failure is additionally reported non-fatally, so it reaches errors$ without killing
    // the call.
    await expect(
      fixture.vertoManager.sendCallControl('call.mute', { channels: ['audio'] })
    ).rejects.toThrow('no such call');

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.onError.mock.calls[0][1]).toEqual({ ...NON_FATAL, ...MAIN_LEG });
  });

  it('sendCallControl: a nested result.result JSONRPC error is reported non-fatally', async () => {
    fixture = createFixture(async () => ({
      id: 1,
      result: { result: { error: { code: -32602, message: 'not a member' } } }
    }));

    await expect(
      fixture.vertoManager.sendCallControl('call.member.remove', {})
    ).rejects.toThrow('not a member');

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.onError.mock.calls[0][1]).toEqual({ ...NON_FATAL, ...MAIN_LEG });
  });

  it('sendDigits: a DTMF rejection is reported non-fatally (must not kill the call)', async () => {
    fixture = createFixture(async () => ({
      id: 1,
      error: { code: -32001, message: 'no such call' }
    }));

    await fixture.vertoManager.sendDigits('123#');

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.onError.mock.calls[0][1]).toEqual({ ...NON_FATAL, ...MAIN_LEG });
  });

  it('sendCallControl: a verto-style nested code rejects the promise without calling onError', async () => {
    // This shape is not a JSONRPC `error`, so executeVerto ignores it entirely and
    // findNestedVertoFailure surfaces it to the caller instead.
    fixture = createFixture(async () => ({
      id: 1,
      result: { result: { code: '400', message: 'Bad request' } }
    }));

    await expect(
      fixture.vertoManager.sendCallControl('call.mute', { channels: ['audio'] })
    ).rejects.toThrow('Bad request');
    expect(fixture.onError).not.toHaveBeenCalled();
  });

  it('the method rule and the leg rule compose, neither overriding the other', async () => {
    // Two independent non-fatal rules meet here: verto.info is best-effort
    // whichever leg carries it (method-scoped), and an auxiliary leg must never
    // kill the call whatever it was doing (leg-scoped). A resolution that kept
    // only one would silently reintroduce the other's defect.
    fixture = createFixture(async () => ({
      id: 1,
      error: { code: -32001, message: 'no such call' }
    }));

    // Leg rule alone: verto.modify on the main leg keeps the default.
    await fixture.vertoManager.hold();
    expect(
      fixture.onError.mock.calls[0][1]?.fatal,
      'main leg + non-info keeps the default'
    ).toBeUndefined();

    // Method rule alone: verto.info on the main leg is forced non-fatal.
    fixture.onError.mockClear();
    await fixture.vertoManager.sendDigits('1');
    expect(
      fixture.onError.mock.calls[0][1]?.fatal,
      'main leg + verto.info is non-fatal'
    ).toBe(false);
  });

  it('sendCallControl: carries a non-numeric failure code into the error message', async () => {
    // JSONRPCError's `code` is numeric, so a non-numeric server code cannot live
    // there; without also putting it in the message the real rejection code is
    // lost entirely (the old `parseInt(code) || 0` collapsed it to 0 and the
    // server `message` alone was surfaced).
    fixture = createFixture(async () => ({
      id: 1,
      result: { result: { code: 'FORBIDDEN', message: 'Not allowed' } }
    }));

    await expect(
      fixture.vertoManager.sendCallControl('call.mute', { channels: ['audio'] })
    ).rejects.toThrow('FORBIDDEN');
    expect(fixture.onError).not.toHaveBeenCalled();
  });

  it('hold (verto.modify): a signaling-critical failure keeps the DEFAULT classification', async () => {
    // The non-fatal marker is keyed off verto.info, so other frames must be unaffected —
    // otherwise this change would silently disable fatal-error handling call-wide.
    fixture = createFixture(async () => ({
      id: 1,
      error: { code: -32001, message: 'no such call' }
    }));

    await fixture.vertoManager.hold();

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    // "Default" means no forced `fatal` — the classifier decides. Leg identity is
    // still attached, so assert the absence of the flag rather than of the object.
    expect(fixture.onError.mock.calls[0][1]).toEqual(MAIN_LEG);
    expect(fixture.onError.mock.calls[0][1]?.fatal).toBeUndefined();
  });
});

/**
 * A signaling status for a leg the registry no longer holds is not a reason to
 * end the call.
 *
 * Auxiliary legs are now removed from the registry when they fail, so a late
 * verto.answer or verto.media for one of them finds nothing — and that lookup
 * miss was reported through the raw onError callback, bypassing the leg rule
 * entirely and landing on CallFactory's default, which destroys the call.
 */
describe('VertoManager - a signaling status for an unknown leg is never fatal', () => {
  let fixture: ReturnType<typeof createFixture>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
  });

  const pushVertoAnswer = (callID: string, callSession: WebRTCCall): void => {
    (
      callSession.webrtcMessages$ as unknown as Subject<unknown>
    ).next({
      jsonrpc: '2.0',
      method: 'verto.answer',
      params: { callID, sdp: 'v=0' }
    });
  };

  it('reports a late answer for a removed leg non-fatally', () => {
    fixture = createFixture(async () => ({ id: 1, result: {} }));

    pushVertoAnswer('a-leg-that-is-gone', fixture.callSession);

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(
      fixture.onError.mock.calls[0][1]?.fatal,
      'an unknown leg cannot be a reason to destroy the call'
    ).toBe(false);
  });

  it('names no leg, because there is no leg to name', () => {
    fixture = createFixture(async () => ({ id: 1, result: {} }));

    pushVertoAnswer('a-leg-that-is-gone', fixture.callSession);

    expect(fixture.onError.mock.calls[0][1]).toEqual({ fatal: false });
  });

  it('still emits the status for a known main leg', () => {
    fixture = createFixture(async () => ({ id: 1, result: {} }));
    const statuses: string[] = [];
    const sub = fixture.vertoManager.signalingStatus$.subscribe((status) =>
      statuses.push(status)
    );

    pushVertoAnswer('main-call-id', fixture.callSession);

    expect(statuses, 'the known-leg path is untouched').toContain('connecting');
    expect(fixture.onError).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
});

/**
 * A server-pushed constraint failure is never fatal, on any leg.
 *
 * `verto.mediaParams` is the server asking for constraints, not a verdict on the
 * call's health: both constraint paths already catch a failure, report the params
 * as not applied and let the call continue. Only the error report was left to the
 * default classification, where a main-leg throw would be fatal — so the
 * non-fatal treatment now holds structurally rather than depending on which code
 * happens to catch first.
 */
describe('VertoManager - a server-pushed constraint failure is never fatal', () => {
  let fixture: ReturnType<typeof createFixture>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
  });

  const pushMediaParams = (callID: string, callSession: WebRTCCall): void => {
    (
      callSession.webrtcMessages$ as unknown as Subject<unknown>
    ).next({
      jsonrpc: '2.0',
      method: 'verto.mediaParams',
      params: { callID, mediaParams: { audio: { echoCancellation: false } } }
    });
  };

  it('reports a MAIN-leg constraint failure non-fatally', async () => {
    fixture = createFixture(async () => ({ id: 1, result: {} }));
    vi.spyOn(
      fixture.vertoManager.mainPeerConnection,
      'updateSendersConstraints'
    ).mockRejectedValue(new Error('OverconstrainedError'));

    pushMediaParams('main-call-id', fixture.callSession);

    await vi.waitFor(() => expect(fixture.onError).toHaveBeenCalledTimes(1));
    expect(fixture.onError.mock.calls[0][1]).toEqual({ ...NON_FATAL, ...MAIN_LEG });
  });
});
