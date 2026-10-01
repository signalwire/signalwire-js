import { BehaviorSubject, Subject } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { MockRTCPeerConnection } from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * A verto.pong lost in a reconnect must be sent again.
 *
 * The server hangs up a call when no verto.pong arrives for a full ping
 * interval. It checks only the callID, not which ping a pong answers, so the
 * SDK answers the last ping of each leg again when the session re-authenticates.
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
    detach: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined)
  }) as unknown as AttachManager;

function createFixture() {
  const execute = vi.fn(async () => ({ jsonrpc: '2.0', id: 'pong-response', result: {} }));
  const authenticated$ = new BehaviorSubject<boolean>(true);
  const webrtcMessages$ = new Subject<unknown>();
  const callSession = {
    id: 'main-call-id',
    to: '/public/test-room',
    options: { audio: false, video: false, receiveAudio: true },
    clientSession: { iceServers: [], authenticated$ },
    webrtcMessages$,
    callEvent$: new Subject(),
    answered$: new Subject(),
    mediaDirections: { audio: 'inactive', video: 'inactive' },
    execute,
    addCallId: vi.fn(),
    emitMediaParamsUpdated: vi.fn(),
    destroy: vi.fn()
  } as unknown as WebRTCCall;
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
    { onError: vi.fn() }
  );

  return { vertoManager, execute, authenticated$, webrtcMessages$ };
}

function vertoPing(callID: string) {
  return {
    jsonrpc: '2.0',
    id: `ping-${callID}`,
    method: 'verto.ping',
    params: { callID, dialogParams: { callID } }
  };
}

function sentPongCallIds(execute: ReturnType<typeof vi.fn>): string[] {
  return execute.mock.calls
    .map(
      ([request]) =>
        (request as { params: { message: { method: string; params: { callID: string } } } }).params
          .message
    )
    .filter((message) => message.method === 'verto.pong')
    .map((message) => message.params.callID);
}

describe('VertoManager - verto.pong after a reconnect', () => {
  let fixture: ReturnType<typeof createFixture>;

  afterEach(() => {
    fixture?.vertoManager.destroy();
  });

  it('answers the last ping of each leg again when the session re-authenticates', () => {
    fixture = createFixture();
    fixture.webrtcMessages$.next(vertoPing('main-call-id'));
    fixture.webrtcMessages$.next(vertoPing('screen-share-id'));
    expect(sentPongCallIds(fixture.execute)).toEqual(['main-call-id', 'screen-share-id']);

    fixture.authenticated$.next(false);
    fixture.authenticated$.next(true);

    expect(sentPongCallIds(fixture.execute)).toEqual([
      'main-call-id',
      'screen-share-id',
      'main-call-id',
      'screen-share-id'
    ]);
  });

  it('sends no pong on re-authentication before the first ping', () => {
    fixture = createFixture();

    fixture.authenticated$.next(false);
    fixture.authenticated$.next(true);

    expect(sentPongCallIds(fixture.execute)).toEqual([]);
  });
});
