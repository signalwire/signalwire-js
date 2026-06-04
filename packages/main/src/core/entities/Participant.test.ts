import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';

import { Participant, SelfParticipant } from './Participant';

import type { ExecuteMethod } from './Participant';
import type { DeviceController } from '../../interfaces/DeviceController';
import type { VertoManager } from '../../interfaces/VertoManager';
import type { MemberTarget } from '../RPCMessages/types/common';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDeviceController(): DeviceController {
  return {} as unknown as DeviceController;
}

function createMockExecuteMethod(): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({ id: 1, result: {} });
}

function createParticipant(id: string, executeMethod: ExecuteMethod): Participant {
  return new Participant(id, executeMethod, createMockDeviceController());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Participant - remove()', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let participant: Participant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    participant = createParticipant('member-abc', executeMethod as ExecuteMethod);
  });

  afterEach(() => {
    participant.destroy();
  });

  it('calls executeMethod with "call.member.remove" method', async () => {
    await participant.remove();

    expect(executeMethod).toHaveBeenCalledOnce();
    expect(executeMethod.mock.calls[0][1]).toBe('call.member.remove');
  });

  it('passes a MemberTarget object (not a plain string) as the target', async () => {
    await participant.remove();

    const target = executeMethod.mock.calls[0][0];
    expect(typeof target).toBe('object');
    expect(target).not.toBeNull();
  });

  it('includes the participant member_id in the target', async () => {
    await participant.remove();

    const target = executeMethod.mock.calls[0][0] as MemberTarget;
    expect(target.member_id).toBe('member-abc');
  });

  it("uses the participant's own call_id from state (not a hardcoded fallback)", async () => {
    // Simulate receiving member data with a specific call_id
    participant.upnext({
      member_id: 'member-abc',
      call_id: 'participant-call-id',
      node_id: 'participant-node-id',
      name: 'Test User',
      type: 'member'
    } as Parameters<typeof participant.upnext>[0]);

    await participant.remove();

    const target = executeMethod.mock.calls[0][0] as MemberTarget;
    expect(target.call_id).toBe('participant-call-id');
    expect(target.node_id).toBe('participant-node-id');
  });

  it('does not send the empty args object as part of the target', async () => {
    await participant.remove();

    const args = executeMethod.mock.calls[0][2];
    expect(args).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// SelfParticipant - Studio Audio Mode
// ---------------------------------------------------------------------------

function createMockVertoManager(): VertoManager {
  return {
    screenShareStatus$: of('none'),
    screenShareStatus: 'none',
    addScreenMedia: vi.fn().mockResolvedValue(undefined),
    removeScreenMedia: vi.fn().mockResolvedValue(undefined),
    addInputDevice: vi.fn().mockResolvedValue(undefined),
    removeInputDevices: vi.fn().mockResolvedValue(undefined),
    addMainInputDevices: vi.fn().mockResolvedValue(undefined),
    updateMediaConstraints: vi.fn().mockResolvedValue(undefined),
    muteMainAudioInputDevice: vi.fn(),
    unmuteMainAudioInputDevice: vi.fn().mockResolvedValue(undefined),
    muteMainVideoInputDevice: vi.fn(),
    unmuteMainVideoInputDevice: vi.fn().mockResolvedValue(undefined)
  } as unknown as VertoManager;
}

function createSelfParticipant(
  id: string,
  executeMethod: ExecuteMethod,
  vertoManager?: VertoManager
): SelfParticipant {
  return new SelfParticipant(
    id,
    executeMethod,
    vertoManager ?? createMockVertoManager(),
    createMockDeviceController()
  );
}

describe('SelfParticipant - Studio Audio Mode', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let selfParticipant: SelfParticipant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    selfParticipant = createSelfParticipant('self-member', executeMethod as ExecuteMethod);
  });

  afterEach(() => {
    selfParticipant.destroy();
  });

  it('starts with studioAudio disabled', () => {
    expect(selfParticipant.studioAudio).toBe(false);
  });

  it('enableStudioAudio sets all audio processing flags to false', async () => {
    await selfParticipant.enableStudioAudio();

    expect(selfParticipant.studioAudio).toBe(true);
    expect(executeMethod).toHaveBeenCalledWith('self-member', 'call.audioflags.set', {
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: false
    });
  });

  it('disableStudioAudio restores all audio processing flags to true', async () => {
    await selfParticipant.enableStudioAudio();
    executeMethod.mockClear();

    await selfParticipant.disableStudioAudio();

    expect(selfParticipant.studioAudio).toBe(false);
    expect(executeMethod).toHaveBeenCalledWith('self-member', 'call.audioflags.set', {
      echo_cancellation: true,
      auto_gain: true,
      noise_suppression: true
    });
  });

  it('enableStudioAudio is idempotent (no RPC if already enabled)', async () => {
    await selfParticipant.enableStudioAudio();
    executeMethod.mockClear();

    await selfParticipant.enableStudioAudio();

    expect(executeMethod).not.toHaveBeenCalled();
  });

  it('disableStudioAudio is idempotent (no RPC if already disabled)', async () => {
    await selfParticipant.disableStudioAudio();

    expect(executeMethod).not.toHaveBeenCalled();
  });

  it('toggleEchoCancellation exits studio mode first', async () => {
    await selfParticipant.enableStudioAudio();
    executeMethod.mockClear();

    // Simulate the participant state having echo cancellation off (set by studio mode)
    selfParticipant.upnext({
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: false
    } as Parameters<typeof selfParticipant.upnext>[0]);

    await selfParticipant.toggleEchoCancellation();

    expect(selfParticipant.studioAudio).toBe(false);
    // The toggle should have called call.audioflags.set
    expect(executeMethod).toHaveBeenCalledWith('self-member', 'call.audioflags.set', {
      echo_cancellation: true,
      auto_gain: false,
      noise_suppression: false
    });
  });

  it('toggleAudioInputAutoGain exits studio mode first', async () => {
    await selfParticipant.enableStudioAudio();
    executeMethod.mockClear();

    selfParticipant.upnext({
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: false
    } as Parameters<typeof selfParticipant.upnext>[0]);

    await selfParticipant.toggleAudioInputAutoGain();

    expect(selfParticipant.studioAudio).toBe(false);
    expect(executeMethod).toHaveBeenCalledWith('self-member', 'call.audioflags.set', {
      echo_cancellation: false,
      auto_gain: true,
      noise_suppression: false
    });
  });

  it('toggleNoiseSuppression exits studio mode first', async () => {
    await selfParticipant.enableStudioAudio();
    executeMethod.mockClear();

    selfParticipant.upnext({
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: false
    } as Parameters<typeof selfParticipant.upnext>[0]);

    await selfParticipant.toggleNoiseSuppression();

    expect(selfParticipant.studioAudio).toBe(false);
    expect(executeMethod).toHaveBeenCalledWith('self-member', 'call.audioflags.set', {
      echo_cancellation: false,
      auto_gain: false,
      noise_suppression: true
    });
  });

  it('studioAudio$ emits state changes', async () => {
    const emissions: boolean[] = [];
    selfParticipant.studioAudio$.subscribe((val) => emissions.push(val));

    await selfParticipant.enableStudioAudio();
    await selfParticipant.disableStudioAudio();

    expect(emissions).toEqual([false, true, false]);
  });
});
