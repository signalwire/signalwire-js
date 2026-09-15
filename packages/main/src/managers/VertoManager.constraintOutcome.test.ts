import { Subject } from 'rxjs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebRTCVertoManager } from './VertoManager';
import { MediaTrackError } from '../core/errors';
import { MockMediaStream, MockMediaStreamTrack, MockRTCPeerConnection } from '../testing/webrtc-mocks';

import type { AttachManager } from './AttachManager';
import type { WebRTCCall } from '../core/entities/Call';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';

/**
 * An app-initiated constraint update has to report what happened.
 *
 * The outcome already exists — `updateSendersConstraints` returns it and
 * `mediaParamsUpdated.applied` is built from it — but only the server-push
 * caller read it. An application calling `setEchoCancellation` got a promise
 * that resolved the same way whether the constraint reached the microphone,
 * was skipped because the sender carries media the SDK does not own, or found
 * no sender at all.
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

const createMockCallSession = (options: Record<string, unknown>): WebRTCCall =>
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
    emitMediaParamsUpdated: vi.fn(),
    destroy: vi.fn()
  }) as unknown as WebRTCCall;

interface Fixture {
  vertoManager: WebRTCVertoManager;
  onError: ReturnType<typeof vi.fn>;
  pcInstances: MockRTCPeerConnection[];
}

const createFixture = (
  options: Record<string, unknown>,
  getUserMedia?: ReturnType<typeof vi.fn>
): Fixture => {
  const pcInstances: MockRTCPeerConnection[] = [];
  const MockPeerConnectionConstructor = vi.fn(function (this: unknown, config?: RTCConfiguration) {
    const pc = new MockRTCPeerConnection(config);
    pcInstances.push(pc);
    return pc as unknown as RTCPeerConnection;
  });

  const webRTCApiProvider = {
    RTCPeerConnection: MockPeerConnectionConstructor as unknown as typeof RTCPeerConnection,
    mediaDevices: {
      getUserMedia:
        getUserMedia ??
        vi.fn(async () => new MockMediaStream([new MockMediaStreamTrack('audio')]) as unknown as MediaStream),
      getDisplayMedia: vi.fn(),
      enumerateDevices: vi.fn(async () => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }
  } as unknown as WebRTCApiProvider;

  const onError = vi.fn();
  const vertoManager = new WebRTCVertoManager(
    createMockCallSession(options),
    createMockAttachManager(),
    createMockDeviceController(),
    webRTCApiProvider,
    { onError }
  );

  return { vertoManager, onError, pcInstances };
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

describe('VertoManager - updateMediaConstraints reports whether the constraints took', () => {
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

    await expect(
      fixture.vertoManager.updateMediaConstraints({ audio: { echoCancellation: false } })
    ).resolves.toBe(true);
  });

  it('reports not applied when the leg has no sender of that kind', async () => {
    fixture = createFixture({ audio: false, video: false, receiveAudio: true });

    await expect(
      fixture.vertoManager.updateMediaConstraints({ audio: { echoCancellation: false } })
    ).resolves.toBe(false);
  });

  it('reports not applied when the sender carries media the SDK did not capture', async () => {
    const supplied = new MockMediaStreamTrack('audio');
    fixture = createFixture({
      audio: false,
      video: false,
      receiveAudio: true,
      inputAudioStream: new MockMediaStream([supplied]) as unknown as MediaStream
    });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    await expect(
      fixture.vertoManager.updateMediaConstraints({ audio: { echoCancellation: false } })
    ).resolves.toBe(false);
  });

  it('reports not applied when only one of the two kinds could be applied', async () => {
    fixture = createFixture({ audio: true, receiveAudio: true });
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    await expect(
      fixture.vertoManager.updateMediaConstraints({
        audio: { echoCancellation: false },
        video: { width: 1920 }
      })
    ).resolves.toBe(false);
  });

  it('still reports the failure on the error stream, not only in the return value', async () => {
    // The boolean says the constraints did not take; errors$ says why. A caller
    // that never inspects the return value must keep learning about the failure.
    let captures = 0;
    const getUserMedia = vi.fn(async () => {
      captures += 1;
      if (captures > 1) {
        throw new Error('device busy');
      }
      const track = new MockMediaStreamTrack('audio');
      track.applyConstraints = vi.fn().mockRejectedValue(new Error('not supported'));
      return new MockMediaStream([track]) as unknown as MediaStream;
    });

    fixture = createFixture({ audio: true, receiveAudio: true }, getUserMedia);
    await waitFor(() => fixture.pcInstances[0]?.getSenders().length > 0);

    await expect(
      fixture.vertoManager.updateMediaConstraints({ audio: { echoCancellation: false } })
    ).resolves.toBe(false);

    await waitFor(() => fixture.onError.mock.calls.length > 0);
    expect(fixture.onError.mock.calls[0][0]).toBeInstanceOf(MediaTrackError);
  });
});
