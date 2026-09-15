import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
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
 * Tests for the identity a `verto.invite` response publishes:
 * - the main leg's memberID becomes `selfId`, and a re-invite replaces it
 * - an auxiliary leg's memberID reaches its own leg and nothing else
 */

const MAIN_CALL_ID = 'main-call-id';
const MAIN_MEMBER_ID = 'member-main';
const SCREENSHARE_MEMBER_ID = 'member-screenshare';
const ADDITIONAL_MEMBER_ID = 'member-additional';
const MAIN_NODE_ID = 'node-main';
const AUX_NODE_ID = 'node-aux';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const createCallCreatedResponse = (memberID: string, callID: string, nodeId = MAIN_NODE_ID) => ({
  jsonrpc: '2.0',
  id: '1',
  result: {
    node_id: nodeId,
    result: {
      jsonrpc: '2.0',
      id: '1',
      result: { message: 'CALL CREATED', memberID, callID }
    }
  }
});

const createMockDeviceController = (): DeviceController =>
  ({
    selectedAudioInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedVideoInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedAudioInputDeviceConstraints: {},
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn(() => ({}))
  }) as unknown as DeviceController;

const createMockCallSession = (execute: ReturnType<typeof vi.fn>): WebRTCCall =>
  ({
    id: MAIN_CALL_ID,
    to: '/public/test-room',
    from: 'caller',
    fromName: 'Caller',
    toName: 'Test Room',
    userVariables: {},
    options: { audio: true, video: false, receiveAudio: true },
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

const createMockAttachManager = (): AttachManager =>
  ({
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined)
  }) as unknown as AttachManager;

interface Fixture {
  vertoManager: WebRTCVertoManager;
  pcInstances: MockRTCPeerConnection[];
  selfIds: (string | null)[];
  /** The `node_id` of each `webrtc.verto` envelope the manager has sent. */
  sentNodeIds: () => (string | undefined)[];
  /**
   * Feeds a leg the invite response it would get from the server.
   *
   * Reaches past the public API on purpose: driving a real `verto.invite` needs
   * `localDescription$` to emit, which the shared WebRTC mocks never do — their
   * ICE gathering completes before the controller subscribes to it.
   */
  answerInvite: (response: unknown, leg: RTCPeerConnectionController) => void;
}

const createFixture = (): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const MockPeerConnectionConstructor = vi.fn(function (this: unknown, config?: RTCConfiguration) {
    const pc = new MockRTCPeerConnection(config);
    pcInstances.push(pc);
    return pc as unknown as RTCPeerConnection;
  });

  const webRTCApiProvider = {
    RTCPeerConnection: MockPeerConnectionConstructor as unknown as typeof RTCPeerConnection,
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

  const execute = vi.fn(async () => ({ jsonrpc: '2.0', id: '1', result: {} }));

  const vertoManager = new WebRTCVertoManager(
    createMockCallSession(execute),
    createMockAttachManager(),
    createMockDeviceController(),
    webRTCApiProvider,
    { onError: vi.fn() }
  );

  const selfIds: (string | null)[] = [];
  vertoManager.selfId$.subscribe((selfId) => selfIds.push(selfId));

  const sentNodeIds = () =>
    execute.mock.calls.map(
      (call) => (call[0] as unknown as { params?: { node_id?: string } })?.params?.node_id
    );

  const answerInvite = (
    vertoManager as unknown as {
      processInviteResponse: (response: unknown, leg: RTCPeerConnectionController) => void;
    }
  ).processInviteResponse.bind(vertoManager);

  return { vertoManager, pcInstances, selfIds, sentNodeIds, answerInvite };
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

const legsOf = (fixture: Fixture): RTCPeerConnectionController[] =>
  Array.from(
    (
      fixture.vertoManager as unknown as {
        _rtcPeerConnectionsMap: Map<string, RTCPeerConnectionController>;
      }
    )._rtcPeerConnectionsMap.values()
  );

/** Bring an auxiliary leg up to 'connected' and return its real controller. */
const addAuxiliaryLeg = async (
  fixture: Fixture,
  start: () => Promise<unknown>
): Promise<RTCPeerConnectionController> => {
  const known = new Set(legsOf(fixture).map((leg) => leg.id));
  const promise = start();
  await waitFor(() => (fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false));
  fixture.pcInstances[1].simulateConnectionStateChange('connected');
  await promise;
  const leg = legsOf(fixture).find(({ id }) => !known.has(id));
  if (!leg) {
    throw new Error('auxiliary leg was not registered');
  }
  return leg;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCVertoManager - verto.invite response identity', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
    fixture = createFixture();
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  describe('main leg', () => {
    it('publishes the response memberID as selfId', () => {
      const main = fixture.vertoManager.mainPeerConnection;

      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);

      expect(fixture.vertoManager.selfId).toBe(MAIN_MEMBER_ID);
      expect(main.memberId).toBe(MAIN_MEMBER_ID);
      expect(fixture.vertoManager.nodeId).toBe(MAIN_NODE_ID);
    });

    it('overwrites an earlier selfId on a re-invite', () => {
      const main = fixture.vertoManager.mainPeerConnection;
      const rejoinedMemberId = 'member-main-rejoined';

      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);
      fixture.answerInvite(createCallCreatedResponse(rejoinedMemberId, MAIN_CALL_ID), main);

      expect(fixture.vertoManager.selfId).toBe(rejoinedMemberId);
    });
  });

  describe('auxiliary legs', () => {
    it('a screen-share response does not move selfId off the main member', async () => {
      const main = fixture.vertoManager.mainPeerConnection;
      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);

      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );
      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id),
        screenShare
      );

      expect(screenShare.isScreenShare).toBe(true);
      expect(fixture.vertoManager.selfId).toBe(MAIN_MEMBER_ID);
    });

    it('an additional-device response does not move selfId off the main member', async () => {
      const main = fixture.vertoManager.mainPeerConnection;
      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);

      const additional = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addInputDevice({ audio: true })
      );
      fixture.answerInvite(
        createCallCreatedResponse(ADDITIONAL_MEMBER_ID, additional.id),
        additional
      );

      expect(additional.isAdditionalDevice).toBe(true);
      expect(fixture.vertoManager.selfId).toBe(MAIN_MEMBER_ID);
    });

    it('still records the response memberID on the auxiliary leg itself', async () => {
      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );

      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id),
        screenShare
      );

      expect(screenShare.memberId).toBe(SCREENSHARE_MEMBER_ID);
    });

    it('leaves selfId null when only an auxiliary leg has been answered', async () => {
      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );

      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id),
        screenShare
      );

      expect(fixture.vertoManager.selfId).toBeNull();
    });

    it('does not move the call nodeId off the main node', async () => {
      const main = fixture.vertoManager.mainPeerConnection;
      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);

      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );
      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id, AUX_NODE_ID),
        screenShare
      );

      expect(fixture.vertoManager.nodeId).toBe(MAIN_NODE_ID);
    });

    it('emits nothing on selfId$ for an auxiliary leg', async () => {
      const main = fixture.vertoManager.mainPeerConnection;
      fixture.answerInvite(createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID), main);

      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );
      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id),
        screenShare
      );

      expect(fixture.selfIds).toEqual([null, MAIN_MEMBER_ID]);
    });
  });

  describe('node routing', () => {
    /** Main answered on node-main, screen share placed on node-aux. */
    const splitNodes = async (): Promise<RTCPeerConnectionController> => {
      fixture.answerInvite(
        createCallCreatedResponse(MAIN_MEMBER_ID, MAIN_CALL_ID),
        fixture.vertoManager.mainPeerConnection
      );
      const screenShare = await addAuxiliaryLeg(fixture, () =>
        fixture.vertoManager.addScreenMedia()
      );
      fixture.answerInvite(
        createCallCreatedResponse(SCREENSHARE_MEMBER_ID, screenShare.id, AUX_NODE_ID),
        screenShare
      );
      return screenShare;
    };

    it('records the response node_id on each leg', async () => {
      const screenShare = await splitNodes();

      expect(fixture.vertoManager.mainPeerConnection.nodeId).toBe(MAIN_NODE_ID);
      expect(screenShare.nodeId).toBe(AUX_NODE_ID);
    });

    it('sends an auxiliary leg bye to that leg own node', async () => {
      await splitNodes();

      await fixture.vertoManager.removeScreenMedia();

      expect(fixture.sentNodeIds().at(-1)).toBe(AUX_NODE_ID);
    });

    it('sends a main leg bye to the main node after a share on another node', async () => {
      await splitNodes();

      await fixture.vertoManager.bye();

      expect(fixture.sentNodeIds().at(-1)).toBe(MAIN_NODE_ID);
    });
  });
});
