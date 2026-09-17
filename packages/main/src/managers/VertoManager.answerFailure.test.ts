import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { RPC_ERROR_REQUESTER_VALIDATION_FAILED } from '../core/constants';
import { JSONRPCError } from '../core/errors';
import { VertoAnswer } from '../core/RPCMessages';
import {
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCPeerConnection
} from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * A refused `verto.answer` must be reported once and recorded as 'failed', never 'sent'.
 *
 * sendLocalDescriptionOnceAccepted awaited sendLocalDescription inside a try, but
 * sendLocalDescription swallowed every failure internally and never rethrew for
 * verto.answer — so a refused answer fell through to the success path and was
 * marked 'sent' (and attached) instead of 'failed'.
 */

const MAIN_CALL_ID = 'main-call-id';
const RECOVERABLE_CODE = RPC_ERROR_REQUESTER_VALIDATION_FAILED;
const SERVER_MESSAGE = 'Refused';

const nestedErrorResponse = (code: number, message: string) => ({
  jsonrpc: '2.0',
  id: '1',
  result: { result: { error: { code, message } } }
});

const successResponse = {
  jsonrpc: '2.0',
  id: '1',
  result: { result: { result: { message: 'CALL CREATED' } } }
};

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
    id: MAIN_CALL_ID,
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

interface Fixture {
  vertoManager: WebRTCVertoManager;
  callSession: WebRTCCall;
  onError: ReturnType<typeof vi.fn>;
  attachManager: AttachManager;
}

const createFixture = (response: unknown): Fixture => {
  const webRTCApiProvider = {
    RTCPeerConnection: vi.fn(function (this: unknown, config?: RTCConfiguration) {
      return new MockRTCPeerConnection(config) as unknown as RTCPeerConnection;
    }) as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia: vi.fn(
        async () =>
          new MockMediaStream([new MockMediaStreamTrack('audio')]) as unknown as MediaStream
      ),
      getDisplayMedia: vi.fn(
        async () =>
          new MockMediaStream([new MockMediaStreamTrack('video')]) as unknown as MediaStream
      ),
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const onError = vi.fn();
  const attachManager = createMockAttachManager();
  const callSession = createMockCallSession(vi.fn(async () => response));
  const vertoManager = new WebRTCVertoManager(
    callSession,
    attachManager,
    createMockDeviceController(),
    webRTCApiProvider,
    { onError }
  );

  return { vertoManager, callSession, onError, attachManager };
};

/** Sends the answer the way handleInboundAnswer does once the call is accepted. */
const sendAnswer = (fixture: Fixture): Promise<void> => {
  const leg = fixture.vertoManager.mainPeerConnection;
  const promise = fixture.vertoManager.sendLocalDescriptionOnceAccepted(
    VertoAnswer({ dialogParams: { callID: leg.id }, sdp: 'v=0' }),
    leg
  );
  (fixture.callSession.answered$ as unknown as Subject<boolean>).next(true);
  return promise;
};

describe('WebRTCVertoManager - a refused verto.answer', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  it('is reported exactly once, not silently swallowed', async () => {
    fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

    await sendAnswer(fixture);

    expect(fixture.onError).toHaveBeenCalledTimes(1);
    expect(fixture.onError.mock.calls[0][0]).toBeInstanceOf(JSONRPCError);
  });

  it('is recorded as failed, never as sent', async () => {
    fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));
    const leg = fixture.vertoManager.mainPeerConnection;
    const updateAnswerStatusSpy = vi.spyOn(leg, 'updateAnswerStatus');

    await sendAnswer(fixture);

    expect(updateAnswerStatusSpy).toHaveBeenCalledWith({ status: 'failed' });
    expect(updateAnswerStatusSpy).not.toHaveBeenCalledWith({ status: 'sent' });
  });

  it('never attaches a call whose answer failed', async () => {
    fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

    await sendAnswer(fixture);

    expect(fixture.attachManager.attach).not.toHaveBeenCalled();
  });

  it('still records a successful answer as sent and attaches the call', async () => {
    fixture = createFixture(successResponse);
    const leg = fixture.vertoManager.mainPeerConnection;
    const updateAnswerStatusSpy = vi.spyOn(leg, 'updateAnswerStatus');

    await sendAnswer(fixture);

    expect(updateAnswerStatusSpy).toHaveBeenCalledWith({ status: 'sent' });
    expect(fixture.onError).not.toHaveBeenCalled();
    expect(fixture.attachManager.attach).toHaveBeenCalledTimes(1);
  });
});
