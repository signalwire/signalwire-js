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
// Participant - setPosition() (issue #19400 item 1, Flag #5)
// ---------------------------------------------------------------------------

describe('Participant - setPosition()', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let participant: Participant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    participant = createParticipant('member-abc', executeMethod as ExecuteMethod);
    participant.upnext({
      member_id: 'member-abc',
      call_id: 'participant-call-id',
      node_id: 'participant-node-id',
      name: 'Test User',
      type: 'member'
    } as Parameters<typeof participant.upnext>[0]);
  });

  afterEach(() => {
    participant.destroy();
  });

  it('calls executeMethod with "call.member.position.set"', async () => {
    await participant.setPosition('reserved-1');

    expect(executeMethod).toHaveBeenCalledOnce();
    expect(executeMethod.mock.calls[0][1]).toBe('call.member.position.set');
  });

  it('builds the targets[] entry with the participant own call_id/node_id', async () => {
    await participant.setPosition('reserved-1');

    // The gateway keys positions by the TARGET member's own call context, so the
    // RPC must carry this participant's own member_id/call_id/node_id (matching
    // the legacy `setPositions` behavior and `Participant.remove`). #19400.
    const args = executeMethod.mock.calls[0][2] as { targets: { target: MemberTarget }[] };
    const target = args.targets[0].target;
    expect(target.member_id).toBe('member-abc');
    expect(target.call_id).toBe('participant-call-id');
    expect(target.node_id).toBe('participant-node-id');
  });

  it('builds the full targets[] payload in the args (caller owns the targets shape)', async () => {
    await participant.setPosition('reserved-1');

    const args = executeMethod.mock.calls[0][2] as Record<string, unknown>;
    expect(args).toEqual({
      targets: [
        {
          target: {
            member_id: 'member-abc',
            call_id: 'participant-call-id',
            node_id: 'participant-node-id'
          },
          position: 'reserved-1'
        }
      ]
    });
  });
});

// ---------------------------------------------------------------------------
// Participant - toggleLowbitrate() (issue #18326)
// ---------------------------------------------------------------------------

describe('Participant - toggleLowbitrate()', () => {
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

  it('calls executeMethod with "call.lowbitrate.set" and the negated current value', async () => {
    expect(participant.lowbitrate).toBe(false);

    await participant.toggleLowbitrate();

    expect(executeMethod).toHaveBeenCalledOnce();
    expect(executeMethod).toHaveBeenCalledWith('member-abc', 'call.lowbitrate.set', {
      lowbitrate: true
    });
  });

  it('negates the current lowbitrate value rather than always sending true', async () => {
    participant.upnext({ lowbitrate: true } as Parameters<typeof participant.upnext>[0]);

    await participant.toggleLowbitrate();

    expect(executeMethod).toHaveBeenCalledWith('member-abc', 'call.lowbitrate.set', {
      lowbitrate: false
    });
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

// ---------------------------------------------------------------------------
// SelfParticipant - screen share / additional device error propagation
// ---------------------------------------------------------------------------

describe('SelfParticipant - media acquisition error propagation', () => {
  let executeMethod: ReturnType<typeof vi.fn>;

  const createDeniedError = (): Error => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    return error;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
  });

  it('startScreenShare rethrows the original error when addScreenMedia rejects', async () => {
    const original = createDeniedError();
    const vertoManager = createMockVertoManager();
    (vertoManager.addScreenMedia as ReturnType<typeof vi.fn>).mockRejectedValue(original);
    const selfParticipant = createSelfParticipant(
      'self-member',
      executeMethod as ExecuteMethod,
      vertoManager
    );

    await expect(selfParticipant.startScreenShare()).rejects.toBe(original);

    selfParticipant.destroy();
  });

  it('startScreenShare resolves on success', async () => {
    const vertoManager = createMockVertoManager();
    const selfParticipant = createSelfParticipant(
      'self-member',
      executeMethod as ExecuteMethod,
      vertoManager
    );

    await expect(selfParticipant.startScreenShare()).resolves.toBeUndefined();
    expect(vertoManager.addScreenMedia).toHaveBeenCalledOnce();

    selfParticipant.destroy();
  });

  it('addAdditionalDevice rethrows the original error when addInputDevice rejects', async () => {
    const original = createDeniedError();
    const vertoManager = createMockVertoManager();
    (vertoManager.addInputDevice as ReturnType<typeof vi.fn>).mockRejectedValue(original);
    const selfParticipant = createSelfParticipant(
      'self-member',
      executeMethod as ExecuteMethod,
      vertoManager
    );

    await expect(selfParticipant.addAdditionalDevice({ video: true })).rejects.toBe(original);

    selfParticipant.destroy();
  });

  it('addAdditionalDevice resolves on success', async () => {
    const vertoManager = createMockVertoManager();
    const selfParticipant = createSelfParticipant(
      'self-member',
      executeMethod as ExecuteMethod,
      vertoManager
    );

    await expect(selfParticipant.addAdditionalDevice({ video: true })).resolves.toBeUndefined();
    expect(vertoManager.addInputDevice).toHaveBeenCalledWith({ video: true });

    selfParticipant.destroy();
  });
});
