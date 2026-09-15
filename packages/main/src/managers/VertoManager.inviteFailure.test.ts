import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { isFatalError } from './CallFactory';
import { RPC_ERROR_REQUESTER_VALIDATION_FAILED } from '../core/constants';
import { JSONRPCError } from '../core/errors';
import { VertoInvite } from '../core/RPCMessages';
import {
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCPeerConnection
} from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { RTCPeerConnectionController } from '../controllers/RTCPeerConnectionController';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * A refused `verto.invite` must reach onError once, carrying the server's own code.
 *
 * executeVerto used to report the failure AND return the error response, so
 * processInviteResponse was handed a response it could not recognise and reported
 * it a second time as a bare Error. CallFactory.isFatalError has no case for a bare
 * Error, so that second report was fatal whatever the server had actually said —
 * destroying the call even for a code the session is built to recover from.
 */

const MAIN_CALL_ID = 'main-call-id';
/** A refusal the session recovers from by re-authenticating and retrying. */
const RECOVERABLE_CODE = RPC_ERROR_REQUESTER_VALIDATION_FAILED;
/** A refusal nothing recovers from. */
const FATAL_CODE = -32000;
const SERVER_MESSAGE = 'Must provide a participant invite first';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const nestedErrorResponse = (code: number, message: string) => ({
  jsonrpc: '2.0',
  id: '1',
  result: { result: { error: { code, message } } }
});

const topLevelErrorResponse = (code: number, message: string) => ({
  jsonrpc: '2.0',
  id: '1',
  error: { code, message }
});

/** A response carrying no error, but not the 'CALL CREATED' the invite asked for. */
const unrecognisedResponse = {
  jsonrpc: '2.0',
  id: '1',
  result: { result: { result: { message: 'SOMETHING ELSE' } } }
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
  pcInstances: MockRTCPeerConnection[];
  attachManager: AttachManager;
}

const createFixture = (response: unknown): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const webRTCApiProvider = {
    RTCPeerConnection: vi.fn(function (this: unknown, config?: RTCConfiguration) {
      const pc = new MockRTCPeerConnection(config);
      pcInstances.push(pc);
      return pc as unknown as RTCPeerConnection;
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

  return { vertoManager, callSession, onError, pcInstances, attachManager };
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

/**
 * Sends the invite the way setupLocalDescriptionHandler does.
 *
 * Reaches past the public API on purpose: driving a real `verto.invite` needs
 * `localDescription$` to emit, which the shared WebRTC mocks never do — their ICE
 * gathering completes before the controller subscribes to it.
 */
const sendInvite = async (fixture: Fixture, leg: RTCPeerConnectionController): Promise<void> =>
  (
    fixture.vertoManager as unknown as {
      sendLocalDescription: (
        message: unknown,
        controller: RTCPeerConnectionController
      ) => Promise<void>;
    }
  ).sendLocalDescription(VertoInvite({ dialogParams: { callID: leg.id }, sdp: 'v=0' }), leg);

/** Bring a screen-share leg up to 'connected' and return its controller. */
const addScreenShareLeg = async (fixture: Fixture): Promise<RTCPeerConnectionController> => {
  const promise = fixture.vertoManager.addScreenMedia();
  await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
  fixture.pcInstances[1].simulateConnectionStateChange('connected');
  await promise;
  const leg = fixture.vertoManager.rtcPeerConnections.find((pc) => pc.propose === 'screenshare');
  if (!leg) {
    throw new Error('screenshare leg was not registered');
  }
  return leg;
};

/** The single error handed to onError, failing loudly if there was not exactly one. */
const onlyReportedError = (fixture: Fixture): Error => {
  expect(fixture.onError, 'one failure must be reported once').toHaveBeenCalledTimes(1);
  return fixture.onError.mock.calls[0][0] as Error;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCVertoManager - a refused verto.invite', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  describe('main leg', () => {
    it('reports a nested refusal exactly once', async () => {
      fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      expect(fixture.onError).toHaveBeenCalledTimes(1);
    });

    it('never runs the CALL CREATED side effects — the throw skips processInviteResponse entirely', async () => {
      const statuses: string[] = [];
      fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));
      fixture.vertoManager.signalingStatus$.subscribe((status) => statuses.push(status));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      expect(fixture.attachManager.attach).not.toHaveBeenCalled();
      expect(statuses).not.toContain('trying');
      expect(fixture.vertoManager.selfId).toBeNull();
    });

    it('reports the code and message the server sent', async () => {
      fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      const reported = onlyReportedError(fixture);
      expect(reported).toBeInstanceOf(JSONRPCError);
      expect((reported as JSONRPCError).code).toBe(RECOVERABLE_CODE);
      expect(reported.message).toBe(SERVER_MESSAGE);
    });

    it('leaves a recoverable refusal recoverable', async () => {
      fixture = createFixture(nestedErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      // The classifier decides for a main leg, so the report must carry no forced
      // `fatal` and must be an error the classifier spares.
      expect(fixture.onError.mock.calls[0][1]?.fatal).toBeUndefined();
      expect(
        isFatalError(onlyReportedError(fixture)),
        'a code the session re-authenticates for must not destroy the call'
      ).toBe(false);
    });

    it('keeps a refusal the session cannot recover from fatal', async () => {
      fixture = createFixture(nestedErrorResponse(FATAL_CODE, 'FORBIDDEN'));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      expect(isFatalError(onlyReportedError(fixture))).toBe(true);
    });

    it('reports a top-level refusal exactly once too', async () => {
      fixture = createFixture(topLevelErrorResponse(RECOVERABLE_CODE, SERVER_MESSAGE));

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      const reported = onlyReportedError(fixture);
      expect(reported).toBeInstanceOf(JSONRPCError);
      expect((reported as JSONRPCError).code).toBe(RECOVERABLE_CODE);
    });
  });

  describe('auxiliary leg', () => {
    it('reports once, non-fatally, against the leg that failed', async () => {
      fixture = createFixture(nestedErrorResponse(FATAL_CODE, SERVER_MESSAGE));
      const leg = await addScreenShareLeg(fixture);
      fixture.onError.mockClear();

      await sendInvite(fixture, leg);

      const reported = onlyReportedError(fixture);
      expect(reported).toBeInstanceOf(JSONRPCError);
      expect(fixture.onError.mock.calls[0][1]).toEqual({
        fatal: false,
        leg: 'screenshare',
        legId: leg.id
      });
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });
  });

  describe('a response carrying no error at all', () => {
    it('is still reported as an unrecognised response', async () => {
      fixture = createFixture(unrecognisedResponse);

      await sendInvite(fixture, fixture.vertoManager.mainPeerConnection);

      const reported = onlyReportedError(fixture);
      expect(reported).not.toBeInstanceOf(JSONRPCError);
      expect(reported.message).toBe('Verto invite failed: unexpected response');
    });
  });
});
