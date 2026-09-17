import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';

import { ParticipantNotReadyError } from '../errors';
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

// The backend locates the member's session by the target's `call_id`, so every
// member RPC must carry the participant's OWN call_id/node_id from state —
// never the local call's id (issue #19400).
const OWN_TARGET: MemberTarget = {
  member_id: 'member-abc',
  call_id: 'participant-call-id',
  node_id: 'participant-node-id'
};

const OWN_CALL_CONTEXT = {
  member_id: 'member-abc',
  call_id: 'participant-call-id',
  node_id: 'participant-node-id',
  name: 'Test User',
  type: 'member'
};

describe('Participant - RPC target uses the participant own call context', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let participant: Participant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    participant = createParticipant('member-abc', executeMethod as ExecuteMethod);
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);
  });

  afterEach(() => {
    participant.destroy();
  });

  const cases: [string, (p: Participant) => Promise<void>][] = [
    ['toggleDeaf', (p) => p.toggleDeaf()],
    ['toggleHandraise', (p) => p.toggleHandraise()],
    ['mute', (p) => p.mute()],
    ['unmute', (p) => p.unmute()],
    ['muteVideo', (p) => p.muteVideo()],
    ['unmuteVideo', (p) => p.unmuteVideo()],
    ['toggleEchoCancellation', (p) => p.toggleEchoCancellation()],
    ['toggleAudioInputAutoGain', (p) => p.toggleAudioInputAutoGain()],
    ['toggleNoiseSuppression', (p) => p.toggleNoiseSuppression()],
    ['toggleLowbitrate', (p) => p.toggleLowbitrate()],
    ['setAudioInputSensitivity', (p) => p.setAudioInputSensitivity(50)],
    ['setAudioInputVolume', (p) => p.setAudioInputVolume(30)],
    ['setAudioOutputVolume', (p) => p.setAudioOutputVolume(30)],
    ['setPosition', (p) => p.setPosition('reserved-1')],
    ['remove', (p) => p.remove()],
    ['end', (p) => p.end()]
  ];

  it.each(cases)('%s targets the participant own call_id/node_id', async (_name, invoke) => {
    await invoke(participant);

    expect(executeMethod).toHaveBeenCalledOnce();
    expect(executeMethod.mock.calls[0][0]).toEqual(OWN_TARGET);
  });

  it('rejects with ParticipantNotReadyError before member state arrives (no RPC sent)', async () => {
    const freshExecute = createMockExecuteMethod();
    const fresh = createParticipant('member-new', freshExecute as ExecuteMethod);

    await expect(fresh.mute()).rejects.toBeInstanceOf(ParticipantNotReadyError);
    expect(freshExecute).not.toHaveBeenCalled();

    fresh.destroy();
  });

  it('rejects with ParticipantNotReadyError when node_id is still missing', async () => {
    const freshExecute = createMockExecuteMethod();
    const fresh = createParticipant('member-new', freshExecute as ExecuteMethod);
    fresh.upnext({ call_id: 'some-call-id' } as Parameters<typeof fresh.upnext>[0]);

    await expect(fresh.remove()).rejects.toBeInstanceOf(ParticipantNotReadyError);
    expect(freshExecute).not.toHaveBeenCalled();

    fresh.destroy();
  });
});

describe('Participant - target', () => {
  let participant: Participant;

  beforeEach(() => {
    participant = createParticipant('member-abc', createMockExecuteMethod() as ExecuteMethod);
  });

  afterEach(() => {
    participant.destroy();
  });

  it('throws ParticipantNotReadyError before member state arrives', () => {
    expect(() => participant.target).toThrow(ParticipantNotReadyError);
  });

  it('throws ParticipantNotReadyError when only call_id has arrived', () => {
    participant.upnext({ call_id: 'participant-call-id' } as Parameters<
      typeof participant.upnext
    >[0]);

    expect(() => participant.target).toThrow(ParticipantNotReadyError);
  });

  it('returns the member triple once call_id and node_id are known', () => {
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);

    expect(participant.target).toEqual(OWN_TARGET);
  });
});

describe('Participant - remove()', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let participant: Participant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    participant = createParticipant('member-abc', executeMethod as ExecuteMethod);
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);
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
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);

    await participant.remove();

    const target = executeMethod.mock.calls[0][0] as MemberTarget;
    expect(target.call_id).toBe('participant-call-id');
    expect(target.node_id).toBe('participant-node-id');
  });

  it('builds the targets[] payload in the args (gateway requires targets for member.remove)', async () => {
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);

    await participant.remove();

    const args = executeMethod.mock.calls[0][2];
    expect(args).toEqual({ targets: [OWN_TARGET] });
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

  it('wraps the member triple in each targets[] entry (gateway DTO shape)', async () => {
    await participant.setPosition('reserved-1');

    const args = executeMethod.mock.calls[0][2] as { targets: Record<string, unknown>[] };
    const entry = args.targets[0];
    expect(entry.target).toEqual({
      member_id: 'member-abc',
      call_id: 'participant-call-id',
      node_id: 'participant-node-id'
    });
    expect(entry.position).toBe('reserved-1');
  });

  it('builds the full targets[] payload in the args', async () => {
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
    participant.upnext(OWN_CALL_CONTEXT as Parameters<typeof participant.upnext>[0]);
  });

  afterEach(() => {
    participant.destroy();
  });

  it('calls executeMethod with "call.lowbitrate.set" and the negated current value', async () => {
    expect(participant.lowbitrate).toBe(false);

    await participant.toggleLowbitrate();

    expect(executeMethod).toHaveBeenCalledOnce();
    expect(executeMethod).toHaveBeenCalledWith(OWN_TARGET, 'call.lowbitrate.set', {
      lowbitrate: true
    });
  });

  it('negates the current lowbitrate value rather than always sending true', async () => {
    participant.upnext({ lowbitrate: true } as Parameters<typeof participant.upnext>[0]);

    await participant.toggleLowbitrate();

    expect(executeMethod).toHaveBeenCalledWith(OWN_TARGET, 'call.lowbitrate.set', {
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
    updateMediaConstraints: vi.fn().mockResolvedValue(true),
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

const SELF_TARGET: MemberTarget = {
  member_id: 'self-member',
  call_id: 'self-call-id',
  node_id: 'self-node-id'
};

describe('SelfParticipant - Studio Audio Mode', () => {
  let executeMethod: ReturnType<typeof vi.fn>;
  let selfParticipant: SelfParticipant;

  beforeEach(() => {
    vi.clearAllMocks();
    executeMethod = createMockExecuteMethod();
    selfParticipant = createSelfParticipant('self-member', executeMethod as ExecuteMethod);
    selfParticipant.upnext({
      member_id: 'self-member',
      call_id: 'self-call-id',
      node_id: 'self-node-id'
    } as Parameters<typeof selfParticipant.upnext>[0]);
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
    expect(executeMethod).toHaveBeenCalledWith(SELF_TARGET, 'call.audioflags.set', {
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
    expect(executeMethod).toHaveBeenCalledWith(SELF_TARGET, 'call.audioflags.set', {
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
    expect(executeMethod).toHaveBeenCalledWith(SELF_TARGET, 'call.audioflags.set', {
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
    expect(executeMethod).toHaveBeenCalledWith(SELF_TARGET, 'call.audioflags.set', {
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
    expect(executeMethod).toHaveBeenCalledWith(SELF_TARGET, 'call.audioflags.set', {
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

  it('startScreenShare forwards its options to addScreenMedia', async () => {
    const vertoManager = createMockVertoManager();
    const selfParticipant = createSelfParticipant(
      'self-member',
      executeMethod as ExecuteMethod,
      vertoManager
    );

    await selfParticipant.startScreenShare({ audio: true });

    expect(vertoManager.addScreenMedia).toHaveBeenCalledWith({ audio: true });

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

// ---------------------------------------------------------------------------
// SelfParticipant - constraint updates report whether they took
// ---------------------------------------------------------------------------

describe('SelfParticipant - constraint setters report the outcome', () => {
  let vertoManager: VertoManager;
  let selfParticipant: SelfParticipant;

  const updateMediaConstraints = (): ReturnType<typeof vi.fn> =>
    vertoManager.updateMediaConstraints as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vertoManager = createMockVertoManager();
    selfParticipant = createSelfParticipant(
      'self-member',
      createMockExecuteMethod() as ExecuteMethod,
      vertoManager
    );
  });

  afterEach(() => {
    selfParticipant.destroy();
  });

  it('setAudioInputDeviceConstraints passes the outcome through', async () => {
    updateMediaConstraints().mockResolvedValue(true);
    await expect(
      selfParticipant.setAudioInputDeviceConstraints({ echoCancellation: false })
    ).resolves.toBe(true);

    updateMediaConstraints().mockResolvedValue(false);
    await expect(
      selfParticipant.setAudioInputDeviceConstraints({ echoCancellation: false })
    ).resolves.toBe(false);
  });

  it('setVideoInputDeviceConstraints passes the outcome through', async () => {
    updateMediaConstraints().mockResolvedValue(false);
    await expect(selfParticipant.setVideoInputDeviceConstraints({ width: 1920 })).resolves.toBe(
      false
    );
  });

  it('setInputDevicesConstraints passes the outcome through', async () => {
    updateMediaConstraints().mockResolvedValue(false);
    await expect(
      selfParticipant.setInputDevicesConstraints({
        audio: { echoCancellation: false },
        video: { width: 1920 }
      })
    ).resolves.toBe(false);
  });
});
