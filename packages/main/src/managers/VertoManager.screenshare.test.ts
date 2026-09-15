import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/logger', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    wsTraffic: vi.fn()
  };
  return { getLogger: () => mockLogger };
});

import { WebRTCVertoManager } from './VertoManager';
import { getLogger } from '../utils/logger';
import { DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS } from '../core/constants';
import {
  AuxiliaryLegCancelledError,
  AuxiliaryLegTimeoutError,
  MediaAccessError,
  MediaTrackError,
  ScreenShareAlreadyActiveError
} from '../core/errors';
import {
  MockMediaStream,
  MockMediaStreamTrack,
  MockRTCPeerConnection
} from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { ScreenShareStatus } from './types/verto-manager.types';
import type { RTCPeerConnectionController } from '../controllers/RTCPeerConnectionController';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * Tests for non-fatal media-access handling on auxiliary peer connections
 * (screenshare and additional-device):
 * - a getDisplayMedia/getUserMedia failure never destroys the call
 * - onError receives the typed MediaAccessError once, flagged non-fatal
 * - the public method rejects with the ORIGINAL error (not RxJS EmptyError)
 * - destroying while connecting is a benign cancel (no error, no rejection)
 * - screenShareStatus$ transitions are gated to the screenshare propose
 */

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const createDomException = (name: string, message = 'Permission denied'): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

const createMockDeviceController = (
  selectedAudioInputDeviceConstraints: MediaTrackConstraints | boolean = {}
): DeviceController =>
  ({
    selectedAudioInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedVideoInputDevice$: new Subject<MediaDeviceInfo | null>(),
    selectedAudioInputDeviceConstraints,
    selectedVideoInputDeviceConstraints: {},
    deviceInfoToConstraints: vi.fn(() => ({}))
  }) as unknown as DeviceController;

const createMockCallSession = (execute?: ReturnType<typeof vi.fn>): WebRTCCall =>
  ({
    id: 'main-call-id',
    to: '/public/test-room',
    from: 'caller',
    fromName: 'Caller',
    toName: 'Test Room',
    userVariables: {},
    options: { audio: false, video: false, receiveAudio: true },
    clientSession: { iceServers: [] },
    webrtcMessages$: new Subject(),
    callEvent$: new Subject(),
    answered$: new Subject(),
    mediaDirections: { audio: 'inactive', video: 'inactive' },
    execute: execute ?? vi.fn(() => new Promise(() => {})),
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
  callSession: WebRTCCall;
  onError: ReturnType<typeof vi.fn>;
  pcInstances: MockRTCPeerConnection[];
  getDisplayMedia: ReturnType<typeof vi.fn>;
  getUserMedia: ReturnType<typeof vi.fn>;
  statuses: ScreenShareStatus[];
}

const createFixture = (overrides?: {
  getDisplayMedia?: ReturnType<typeof vi.fn>;
  getUserMedia?: ReturnType<typeof vi.fn>;
  execute?: ReturnType<typeof vi.fn>;
  selectedAudioInputDeviceConstraints?: MediaTrackConstraints | boolean;
}): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const MockPeerConnectionConstructor = vi.fn(function (this: unknown, config?: RTCConfiguration) {
    const pc = new MockRTCPeerConnection(config);
    pcInstances.push(pc);
    return pc as unknown as RTCPeerConnection;
  });

  const getUserMedia =
    overrides?.getUserMedia ??
    vi.fn(async (constraints: MediaStreamConstraints) => {
      const tracks: MockMediaStreamTrack[] = [];
      if (constraints.audio) {
        tracks.push(new MockMediaStreamTrack('audio'));
      }
      if (constraints.video) {
        tracks.push(new MockMediaStreamTrack('video'));
      }
      return new MockMediaStream(tracks) as unknown as MediaStream;
    });

  const getDisplayMedia =
    overrides?.getDisplayMedia ??
    vi.fn(async () => {
      return new MockMediaStream([new MockMediaStreamTrack('video')]) as unknown as MediaStream;
    });

  const webRTCApiProvider = {
    RTCPeerConnection: MockPeerConnectionConstructor as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia,
      getDisplayMedia,
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const onError = vi.fn();
  const callSession = createMockCallSession(overrides?.execute);

  const vertoManager = new WebRTCVertoManager(
    callSession,
    createMockAttachManager(),
    createMockDeviceController(overrides?.selectedAudioInputDeviceConstraints),
    webRTCApiProvider,
    { onError }
  );

  const statuses: ScreenShareStatus[] = [];
  vertoManager.screenShareStatus$.subscribe((status) => statuses.push(status));

  return { vertoManager, callSession, onError, pcInstances, getDisplayMedia, getUserMedia, statuses };
};

/** The auxiliary leg's controller — the only non-main entry in the registry. */
const auxController = (fixture: Fixture): RTCPeerConnectionController => {
  const registry = (
    fixture.vertoManager as unknown as {
      _rtcPeerConnectionsMap: Map<string, RTCPeerConnectionController>;
    }
  )._rtcPeerConnectionsMap;
  return Array.from(registry.values()).filter((controller) => !controller.isMainDevice)[0];
};

/** The auxiliary controller's own error stream, to stand in for a leg failure. */
const legErrors = (fixture: Fixture): Subject<Error> =>
  (auxController(fixture) as unknown as { _errors$: Subject<Error> })._errors$;

/** The manager's per-leg error reports, which a waiting init ends on. */
const legErrorReports = (fixture: Fixture): Subject<{ legId: string; error: Error }> =>
  (fixture.vertoManager as unknown as { _legErrors$: Subject<{ legId: string; error: Error }> })
    ._legErrors$;

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebRTCVertoManager - auxiliary peer connection media failures', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  describe('screenshare cancel (getDisplayMedia rejects with NotAllowedError)', () => {
    it('rejects addScreenMedia with the ORIGINAL error and does not destroy the call', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('forwards a single typed MediaAccessError to onError, flagged non-fatal', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.onError).toHaveBeenCalledTimes(1);
      const [forwarded, options] = fixture.onError.mock.calls[0] as [
        MediaAccessError,
        { fatal?: boolean; leg?: string; legId?: string } | undefined
      ];
      expect(forwarded).toBeInstanceOf(MediaAccessError);
      expect(forwarded.fatal).toBe(false);
      expect(forwarded.operation).toBe('startScreenShare');
      expect(forwarded.media).toBe('screen');
      expect(forwarded.originalError).toBe(original);
      expect(forwarded.denied).toBe(true);
      // Non-fatal, and carrying the leg identity so a consumer can tell "the
      // screen share died" from "the call died".
      expect(options).toMatchObject({ fatal: false, leg: 'screenshare' });
      expect(options?.legId, 'the failing leg is identified').toBeTruthy();
    });

    it('transitions screenShareStatus$ starting → none', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixture({ getDisplayMedia: vi.fn(async () => Promise.reject(original)) });

      await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(original);

      expect(fixture.statuses).toEqual(['none', 'starting', 'none']);
      expect(fixture.vertoManager.screenShareStatus).toBe('none');
    });
  });

  describe('screenshare success', () => {
    it('resolves and reaches started when the connection connects', async () => {
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();

      // Wait for the aux peer connection (index 1; index 0 is main) to be
      // listening for connection state changes, then simulate 'connected'.
      await waitFor(
        () => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false
      );
      fixture.pcInstances[1].simulateConnectionStateChange('connected');

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.vertoManager.screenShareStatus).toBe('started');
      expect(fixture.onError).not.toHaveBeenCalled();
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });
  });

  describe('display audio', () => {
    /** Run a share far enough to read the getDisplayMedia constraints, then settle it. */
    const captureDisplayConstraints = async (
      fx: Fixture,
      options?: Parameters<typeof fx.vertoManager.addScreenMedia>[0]
    ): Promise<DisplayMediaStreamOptions> => {
      const promise = fx.vertoManager.addScreenMedia(options);
      await waitFor(() => fx.getDisplayMedia.mock.calls.length > 0);
      await waitFor(() => fx.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      fx.pcInstances[1].simulateConnectionStateChange('connected');
      await promise;
      return fx.getDisplayMedia.mock.calls[0][0] as DisplayMediaStreamOptions;
    };

    it('does not request display audio by default', async () => {
      fixture = createFixture();

      await expect(captureDisplayConstraints(fixture)).resolves.toEqual({
        video: true,
        audio: false
      });
    });

    it('requests display audio when asked', async () => {
      fixture = createFixture();

      await expect(captureDisplayConstraints(fixture, { audio: true })).resolves.toEqual({
        video: true,
        audio: true
      });
    });

    it('does not request display audio for an empty options object', async () => {
      fixture = createFixture();

      await expect(captureDisplayConstraints(fixture, {})).resolves.toEqual({
        video: true,
        audio: false
      });
    });

    it('requests display audio even when audio input is disabled', async () => {
      fixture = createFixture({ selectedAudioInputDeviceConstraints: false });

      await expect(captureDisplayConstraints(fixture, { audio: true })).resolves.toEqual({
        video: true,
        audio: true
      });
    });
  });

  describe('destroy while connecting (benign cancel)', () => {
    it('resolves quietly without onError when the manager is destroyed mid-connect', async () => {
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();

      // Wait until the aux connection exists, then hang up before 'connected'
      await waitFor(
        () => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false
      );
      fixture.vertoManager.destroy();

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.onError).not.toHaveBeenCalled();
    });

    it('resolves quietly when only the aux leg is destroyed mid-connect', async () => {
      // The leg alone, not the manager: branch A is leg-scoped and completes,
      // so nothing but a leg-scoped guard can end the wait.
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      auxController(fixture).destroy();

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.onError).not.toHaveBeenCalled();
    });

    it('resolves quietly when the aux leg is destroyed before local media settles', async () => {
      // Acquisition still in flight, so localMediaSettled$ completes without
      // emitting and the connect budget never starts.
      fixture = createFixture({ getDisplayMedia: vi.fn(() => new Promise<MediaStream>(() => {})) });

      const promise = fixture.vertoManager.addScreenMedia();

      await waitFor(() => Boolean(auxController(fixture)));
      auxController(fixture).destroy();

      await expect(promise).resolves.toBeUndefined();
      expect(fixture.onError).not.toHaveBeenCalled();
    });
  });

  describe('removed before connecting', () => {
    it('rejects addScreenMedia with AuxiliaryLegCancelledError', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);

      const rejection = expect(promise).rejects.toBeInstanceOf(AuxiliaryLegCancelledError);
      await fixture.vertoManager.removeScreenMedia();
      await rejection;

      expect(fixture.vertoManager.screenShareStatus).toBe('none');
      expect(fixture.onError).not.toHaveBeenCalled();
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('does not log the cancel as a failure', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);

      const rejection = expect(promise).rejects.toBeInstanceOf(AuxiliaryLegCancelledError);
      await fixture.vertoManager.removeScreenMedia();
      await rejection;

      expect(getLogger().warn).not.toHaveBeenCalled();
    });

    it('destroys the removed leg exactly once', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      const destroySpy = vi.spyOn(auxController(fixture), 'destroy');

      const rejection = expect(promise).rejects.toBeInstanceOf(AuxiliaryLegCancelledError);
      await fixture.vertoManager.removeScreenMedia();
      await rejection;

      expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it('reports no cancel when a connected share is stopped normally', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      fixture.pcInstances[1].simulateConnectionStateChange('connected');
      await promise;

      const reported: Error[] = [];
      legErrorReports(fixture).subscribe((report) => reported.push(report.error));
      await fixture.vertoManager.removeScreenMedia();

      expect(reported).toEqual([]);
    });

    it('ends the start with a failure the leg reports while connecting', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);

      const reported = new MediaTrackError('addLocalTrack', 'video', new Error('boom'));
      const rejection = expect(promise).rejects.toBe(reported);
      legErrors(fixture).next(reported);
      await rejection;
    });

    it('names the leg on the cancel error', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addScreenMedia();
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);

      const rejection = expect(promise).rejects.toMatchObject({ leg: 'screenshare' });
      await fixture.vertoManager.removeScreenMedia();
      await rejection;
    });

    it('rejects addInputDevice when the device is removed before connecting', async () => {
      fixture = createFixture({ execute: vi.fn(async () => ({ result: {} })) });

      const promise = fixture.vertoManager.addInputDevice({ audio: true });
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);

      const rejection = expect(promise).rejects.toMatchObject({ leg: 'additional-device' });
      await fixture.vertoManager.removeInputDevices(auxController(fixture).id);
      await rejection;

      expect(fixture.onError).not.toHaveBeenCalled();
    });
  });

  describe('auxiliary leg connection timeout', () => {
    it('rejects without calling onError and resets status to none', async () => {
      vi.useFakeTimers();
      try {
        fixture = createFixture();

        const promise = fixture.vertoManager.addScreenMedia();
        const assertion = expect(promise).rejects.toThrow();

        await vi.advanceTimersByTimeAsync(60_000);

        await assertion;
        expect(fixture.onError).not.toHaveBeenCalled();
        expect(fixture.vertoManager.screenShareStatus).toBe('none');
        expect(fixture.callSession.destroy).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not time out while local media is still being acquired', async () => {
      // The bound covers the connect, not the acquisition: a screen-share picker
      // is human time and the human may take as long as they like. A leg whose
      // media never arrives must therefore stay pending, not fail.
      vi.useFakeTimers();
      try {
        fixture = createFixture({
          // Never settles — stands in for a picker left open.
          getUserMedia: vi.fn(() => new Promise<MediaStream>(() => {}))
        });

        let settled = false;
        const promise = fixture.vertoManager.addInputDevice({ audio: true });
        void promise.then(
          () => (settled = true),
          () => (settled = true)
        );

        // Well past the connect budget, which must not have started.
        await vi.advanceTimersByTimeAsync(DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS * 3);
        expect(settled, 'still waiting on the human, not timing out').toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('names the leg in the timeout error', async () => {
      vi.useFakeTimers();
      try {
        fixture = createFixture();
        const promise = fixture.vertoManager.addScreenMedia();
        const assertion = expect(promise).rejects.toMatchObject({
          name: 'AuxiliaryLegTimeoutError',
          leg: 'screenshare'
        });
        await vi.advanceTimersByTimeAsync(60_000);
        await assertion;
      } finally {
        vi.useRealTimers();
      }
    });

    it('removes the dead leg from the registry and clears the screenshare id', async () => {
      // A destroyed controller left in the map keeps being iterated by
      // requestIceRestartAll() and requestKeyframeAll().
      vi.useFakeTimers();
      try {
        fixture = createFixture();
        const before = fixture.vertoManager.rtcPeerConnections.length;

        const promise = fixture.vertoManager.addScreenMedia();
        const assertion = expect(promise).rejects.toThrow();
        await vi.advanceTimersByTimeAsync(60_000);
        await assertion;

        expect(
          fixture.vertoManager.rtcPeerConnections.length,
          'the dead leg is gone from the registry'
        ).toBe(before);
        expect(fixture.vertoManager.screenShareStatus).toBe('none');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('additional-device (getUserMedia rejects with NotAllowedError)', () => {
    const createFixtureWithDeniedCamera = (original: Error): Fixture =>
      createFixture({
        getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) => {
          if (constraints.video) {
            return Promise.reject(original);
          }
          return new MockMediaStream([]) as unknown as MediaStream;
        })
      });

    it('rejects addInputDevice with the ORIGINAL error and does not destroy the call', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: false, video: true })).rejects.toBe(
        original
      );

      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('forwards a single non-fatal MediaAccessError with addInputDevice operation', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: false, video: true })).rejects.toBe(
        original
      );

      expect(fixture.onError).toHaveBeenCalledTimes(1);
      const forwarded = fixture.onError.mock.calls[0][0] as MediaAccessError;
      expect(forwarded).toBeInstanceOf(MediaAccessError);
      expect(forwarded.fatal).toBe(false);
      expect(forwarded.operation).toBe('addInputDevice');
      expect(forwarded.media).toBe('video');
      expect(forwarded.originalError).toBe(original);
    });

    it('reports media audiovideo when both kinds were requested', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(fixture.vertoManager.addInputDevice({ audio: true, video: true })).rejects.toBe(
        original
      );

      const forwarded = fixture.onError.mock.calls[0][0] as MediaAccessError;
      expect(forwarded.media).toBe('audiovideo');
    });

    it('does not touch screenShareStatus$', async () => {
      const original = createDomException('NotAllowedError');
      fixture = createFixtureWithDeniedCamera(original);

      await expect(
        fixture.vertoManager.addInputDevice({ audio: false, video: true })
      ).rejects.toBe(original);

      expect(fixture.statuses).toEqual(['none']);
    });
  });

  /**
   * The leg rule is structural, but it only holds if the leg can be identified.
   *
   * executeVerto resolves the failing leg from `params.callID`, which defaults
   * to the main call id — so a bye sent for an auxiliary leg was attributed to
   * the main leg and, being a signaling frame, classified fatal. Stopping a
   * screen share the server had already torn down would destroy the call.
   */
  describe('auxiliary leg bye failures', () => {
    const startScreenShare = async (fx: Fixture): Promise<string> => {
      const promise = fx.vertoManager.addScreenMedia();
      await waitFor(() => fx.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      fx.pcInstances[1].simulateConnectionStateChange('connected');
      await promise;
      const auxLeg = fx.vertoManager.rtcPeerConnections.find((pc) => pc.propose === 'screenshare');
      if (!auxLeg) {
        throw new Error('screenshare leg was not registered');
      }
      return auxLeg.id;
    };

    it('reports a rejected auxiliary bye against the auxiliary leg, non-fatally', async () => {
      fixture = createFixture({
        execute: vi.fn(async () => ({
          id: 1,
          error: { code: -32002, message: 'CALL DOES NOT EXIST' }
        }))
      });

      const auxLegId = await startScreenShare(fixture);
      fixture.onError.mockClear();

      await fixture.vertoManager.removeScreenMedia();

      expect(fixture.onError).toHaveBeenCalled();
      const options = fixture.onError.mock.calls.at(-1)?.[1];
      expect(options?.fatal, 'an auxiliary leg failure never destroys the call').toBe(false);
      expect(options?.leg, 'the failure is attributed to the leg that failed').toBe('screenshare');
      expect(options?.legId).toBe(auxLegId);
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('addresses the bye to the auxiliary leg', async () => {
      const execute = vi.fn(async () => ({ id: 1, result: {} }));
      fixture = createFixture({ execute });

      const auxLegId = await startScreenShare(fixture);
      execute.mockClear();

      await fixture.vertoManager.removeScreenMedia();

      const byeCall = execute.mock.calls
        .map((call) => call[0] as { params?: { callID?: string; message?: { method?: string } } })
        .find((message) => message?.params?.message?.method === 'verto.bye');
      expect(byeCall?.params?.callID, 'the bye carries the leg it is ending').toBe(auxLegId);
    });
  });

  /**
   * A leg-scoped failure reported while an auxiliary leg is connecting must end
   * that leg's wait with the real error.
   *
   * Signaling failures — a rejected invite, a failed SDP send — are reported
   * rather than thrown, and never reach the controller's errors$, which was the
   * only feed the wait watched. So the leg sat at 'starting' for the whole
   * connect budget and then rejected with a bare timeout, hiding the reason the
   * server gave. The trigger below is a server-pushed mediaParams frame for the
   * leg, because this harness cannot drive a full invite; the mechanism under
   * test — reportLegError ending the wait — is the same one a rejected invite
   * travels through.
   */
  describe('auxiliary leg failures reported mid-connect fail the leg fast', () => {
    /** Report a leg-scoped error for `legId` the way the server would. */
    const pushFailingMediaParams = (fx: Fixture, legId: string): void => {
      (fx.callSession.webrtcMessages$ as unknown as { next: (value: unknown) => void }).next({
        jsonrpc: '2.0',
        method: 'verto.mediaParams',
        params: { callID: legId, mediaParams: { audio: { echoCancellation: false } } }
      });
    };

    /** Make the leg's constraint application fail, so the params report an error. */
    const breakConstraints = (fx: Fixture): void => {
      fx.pcInstances[1].getSenders = (() => {
        throw new Error('constraints could not be read');
      }) as unknown as (typeof fx.pcInstances)[1]['getSenders'];
    };

    const auxLegId = (fx: Fixture): string => {
      const leg = fx.vertoManager.rtcPeerConnections.find((pc) => pc.propose === 'screenshare');
      if (!leg) {
        throw new Error('screenshare leg was not registered');
      }
      return leg.id;
    };

    it('rejects addScreenMedia with the reported error instead of waiting out the budget', async () => {
      // The test times out well before DEFAULT_AUX_LEG_CONNECT_TIMEOUT_MS, so
      // reaching the assertion at all is the proof that the wait ended early.
      fixture = createFixture();
      const promise = fixture.vertoManager.addScreenMedia();
      const legId = auxLegId(fixture);
      breakConstraints(fixture);

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      pushFailingMediaParams(fixture, legId);

      await expect(promise).rejects.toThrow('constraints could not be read');
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });

    it('does not disguise the failure as a timeout', async () => {
      fixture = createFixture();
      const promise = fixture.vertoManager.addScreenMedia();
      const legId = auxLegId(fixture);
      breakConstraints(fixture);

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      pushFailingMediaParams(fixture, legId);

      await expect(promise).rejects.not.toBeInstanceOf(AuxiliaryLegTimeoutError);
    });

    it('resets the screenshare status and deregisters the leg', async () => {
      fixture = createFixture();
      const before = fixture.vertoManager.rtcPeerConnections.length;
      const promise = fixture.vertoManager.addScreenMedia();
      const legId = auxLegId(fixture);
      breakConstraints(fixture);

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      pushFailingMediaParams(fixture, legId);

      await expect(promise).rejects.toThrow();
      expect(fixture.vertoManager.screenShareStatus).toBe('none');
      expect(fixture.vertoManager.rtcPeerConnections.length).toBe(before);
    });

    it('reports the failure against the auxiliary leg, non-fatally', async () => {
      fixture = createFixture();
      const promise = fixture.vertoManager.addScreenMedia();
      const legId = auxLegId(fixture);
      breakConstraints(fixture);

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      pushFailingMediaParams(fixture, legId);

      await expect(promise).rejects.toThrow();
      expect(fixture.onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ fatal: false, leg: 'screenshare', legId })
      );
    });

    it('ignores a failure reported for a different leg', async () => {
      // Leg scoping is the whole point: a main-leg report must not fail the
      // auxiliary leg that happens to be connecting.
      fixture = createFixture();
      const promise = fixture.vertoManager.addScreenMedia();
      let settled = false;
      void promise.then(
        () => (settled = true),
        () => (settled = true)
      );

      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      pushFailingMediaParams(fixture, 'main-call-id');
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(settled, 'another leg\'s failure leaves this leg connecting').toBe(false);

      fixture.pcInstances[1].simulateConnectionStateChange('connected');
      await expect(promise).resolves.toBeUndefined();
    });

    it('leaves a connected leg unaffected by a later leg-scoped failure', async () => {
      // The wait is over by then: a failure after connect cannot retroactively
      // fail the screen share.
      fixture = createFixture();

      const promise = fixture.vertoManager.addScreenMedia();
      const legId = auxLegId(fixture);
      await waitFor(() => fixture.pcInstances[1]?.hasListener('connectionstatechange') ?? false);
      fixture.pcInstances[1].simulateConnectionStateChange('connected');
      await expect(promise).resolves.toBeUndefined();

      breakConstraints(fixture);
      pushFailingMediaParams(fixture, legId);
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(fixture.vertoManager.screenShareStatus).toBe('started');
      expect(fixture.callSession.destroy).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Single-share invariant
// ---------------------------------------------------------------------------

describe('WebRTCVertoManager - single screen share invariant', () => {
  let fixture: Fixture;

  beforeEach(() => {
    global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
  });

  afterEach(() => {
    fixture?.vertoManager.destroy();
    vi.clearAllMocks();
  });

  /**
   * Start a share and drive its aux leg to 'connected'. Takes the newest peer
   * connection, not a fixed index, so a retry after a failed attempt works.
   */
  const startShare = async (f: Fixture): Promise<void> => {
    const baseline = f.pcInstances.length;
    const promise = f.vertoManager.addScreenMedia();
    const newest = () => f.pcInstances[f.pcInstances.length - 1];
    await waitFor(
      () => f.pcInstances.length > baseline && newest().hasListener('connectionstatechange')
    );
    newest().simulateConnectionStateChange('connected');
    await promise;
  };

  it('rejects a second addScreenMedia while the first is still starting', async () => {
    fixture = createFixture();

    const first = fixture.vertoManager.addScreenMedia();

    await expect(fixture.vertoManager.addScreenMedia()).rejects.toBeInstanceOf(
      ScreenShareAlreadyActiveError
    );

    expect(fixture.vertoManager.screenShareStatus).toBe('starting');
    expect(fixture.getDisplayMedia).toHaveBeenCalledTimes(1);

    fixture.vertoManager.destroy();
    await expect(first).resolves.toBeUndefined();
  });

  it('rejects a second addScreenMedia while the first is started', async () => {
    fixture = createFixture();
    await startShare(fixture);

    await expect(fixture.vertoManager.addScreenMedia()).rejects.toBeInstanceOf(
      ScreenShareAlreadyActiveError
    );

    expect(fixture.vertoManager.screenShareStatus).toBe('started');
    expect(fixture.getDisplayMedia).toHaveBeenCalledTimes(1);
  });

  it('leaves the first share stoppable after a rejected second attempt', async () => {
    fixture = createFixture();
    vi.mocked(fixture.callSession.execute).mockResolvedValue({} as never);
    await startShare(fixture);
    const shareLegId = fixture.vertoManager.rtcPeerConnections.find((c) => c.isScreenShare)?.id;

    await expect(fixture.vertoManager.addScreenMedia()).rejects.toBeInstanceOf(
      ScreenShareAlreadyActiveError
    );
    await fixture.vertoManager.removeScreenMedia();

    expect(fixture.vertoManager.screenShareStatus).toBe('none');
    expect(fixture.vertoManager.rtcPeerConnections.map((c) => c.id)).not.toContain(shareLegId);
  });

  it('ignores a second removeScreenMedia while the first is still stopping', async () => {
    let releaseBye = (): void => {};
    const bye = new Promise<void>((resolve) => (releaseBye = resolve));
    const execute = vi.fn(async () => {
      await bye;
      return {};
    });
    fixture = createFixture({ execute });
    await startShare(fixture);
    execute.mockClear();

    const first = fixture.vertoManager.removeScreenMedia();
    await waitFor(() => fixture.vertoManager.screenShareStatus === 'stopping');
    const second = fixture.vertoManager.removeScreenMedia();
    releaseBye();
    await Promise.all([first, second]);

    // One bye for the one leg — a second stop mid-stop must not send another.
    expect(execute).toHaveBeenCalledTimes(1);
    expect(fixture.vertoManager.screenShareStatus).toBe('none');
  });

  it('allows a new share after a failed attempt (a stale id must not wedge screen share)', async () => {
    const denial = createDomException('NotAllowedError');
    const getDisplayMedia = vi
      .fn<() => Promise<MediaStream>>()
      .mockRejectedValueOnce(denial)
      .mockImplementation(
        async () =>
          new MockMediaStream([new MockMediaStreamTrack('video')]) as unknown as MediaStream
      );
    fixture = createFixture({ getDisplayMedia });

    await expect(fixture.vertoManager.addScreenMedia()).rejects.toBe(denial);
    await startShare(fixture);

    expect(fixture.vertoManager.screenShareStatus).toBe('started');
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);
  });

  it('does not deregister a live screen share when an additional device fails', async () => {
    fixture = createFixture({
      getUserMedia: vi.fn(async (constraints: MediaStreamConstraints) =>
        constraints.video
          ? Promise.reject(createDomException('NotAllowedError'))
          : (new MockMediaStream([]) as unknown as MediaStream)
      )
    });
    await startShare(fixture);

    await expect(
      fixture.vertoManager.addInputDevice({ audio: false, video: true })
    ).rejects.toThrow();

    expect(fixture.vertoManager.screenShareStatus).toBe('started');
    await expect(fixture.vertoManager.addScreenMedia()).rejects.toBeInstanceOf(
      ScreenShareAlreadyActiveError
    );
  });
});
