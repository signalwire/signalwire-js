import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CallRecoveryManager } from './CallRecoveryManager';

import { BehaviorSubject } from 'rxjs';

import type {
  RecoveryCallbacks,
  RecoveryConfig,
  RecoveryEvent,
  RecoveryInputs,
  RecoveryState,
  RecoveryTrigger
} from './CallRecoveryManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockCallbacks(overrides: Partial<RecoveryCallbacks> = {}): RecoveryCallbacks {
  return {
    requestKeyframe: vi.fn(),
    requestIceRestart: vi.fn().mockResolvedValue(true),
    disableVideo: vi.fn(),
    enableVideo: vi.fn(),
    isNegotiating: vi.fn().mockReturnValue(false),
    isCallConnected: vi.fn().mockReturnValue(true),
    getPeerConnectionState: vi.fn().mockReturnValue('connected'),
    ...overrides
  };
}

function createMockInputs(overrides: Partial<RecoveryInputs> = {}): RecoveryInputs {
  return {
    signalingReady$: new BehaviorSubject<boolean>(true),
    ...overrides
  };
}

/** Short debounce for fast tests. */
const FAST_CONFIG: RecoveryConfig = {
  debounceTimeMs: 50,
  cooldownMs: 100,
  iceGracePeriodMs: 50,
  iceRestartTimeoutMs: 200,
  maxAttempts: 3,
  enableRelayFallback: true,
  keyframeMaxBurst: 3,
  keyframeBurstWindowMs: 200,
  keyframeCooldownMs: 300,
  degradationBitrateThreshold: 150,
  degradationRecoveryThreshold: 300,
  enableAutoDegradation: true
};

function makeTrigger(
  source: RecoveryTrigger['source'] = 'stats',
  detail = 'test',
  issueType?: string
): RecoveryTrigger {
  return { source, detail, issueType };
}

function collectEvents(manager: CallRecoveryManager): RecoveryEvent[] {
  const events: RecoveryEvent[] = [];
  manager.recoveryEvent$.subscribe((e) => events.push(e));
  return events;
}

function collectStates(manager: CallRecoveryManager): RecoveryState[] {
  const states: RecoveryState[] = [];
  manager.recoveryState$.subscribe((s) => states.push(s));
  return states;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CallRecoveryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Construction & initial state
  // -----------------------------------------------------------------------

  describe('initialization', () => {
    it('should start in idle state', () => {
      const manager = new CallRecoveryManager(
        createMockCallbacks(),
        createMockInputs(),
        FAST_CONFIG
      );

      expect(manager.recoveryState).toBe('idle');
      manager.destroy();
    });

    it('should start with bandwidthConstrained = false', () => {
      const manager = new CallRecoveryManager(
        createMockCallbacks(),
        createMockInputs(),
        FAST_CONFIG
      );

      expect(manager.bandwidthConstrained).toBe(false);
      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Debounce: multiple signals within window collapse to one trigger
  // -----------------------------------------------------------------------

  describe('debounce', () => {
    it('should collapse multiple triggers within debounce window into one recovery', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      // Push 5 triggers rapidly
      manager.pushTrigger(makeTrigger('stats', 'no_packets'));
      manager.pushTrigger(makeTrigger('ice', 'disconnected'));
      manager.pushTrigger(makeTrigger('network', 'online'));
      manager.pushTrigger(makeTrigger('stats', 'rtt_spike'));
      manager.pushTrigger(makeTrigger('ice', 'failed'));

      // Advance past debounce window
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      // Let ICE restart resolve
      await vi.advanceTimersByTimeAsync(50);

      // Should have exactly one keyframe + one reinvite_started (one recovery pass)
      const keyframeEvents = events.filter((e) => e.action === 'keyframe_requested');
      const reinviteStarted = events.filter((e) => e.action === 'reinvite_started');

      expect(keyframeEvents).toHaveLength(1);
      expect(reinviteStarted).toHaveLength(1);

      manager.destroy();
    });

    it('should transition to debouncing state when trigger arrives while idle', () => {
      const manager = new CallRecoveryManager(
        createMockCallbacks(),
        createMockInputs(),
        FAST_CONFIG
      );
      const states = collectStates(manager);

      manager.pushTrigger(makeTrigger());

      expect(states).toContain('debouncing');

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Gate checks
  // -----------------------------------------------------------------------

  describe('gate checks', () => {
    it('should block recovery when negotiation is in progress', async () => {
      const callbacks = createMockCallbacks({ isNegotiating: vi.fn().mockReturnValue(true) });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);

      const reinviteEvents = events.filter((e) => e.action === 'reinvite_started');
      expect(reinviteEvents).toHaveLength(0);

      manager.destroy();
    });

    it('should block recovery when signaling is not ready', async () => {
      const callbacks = createMockCallbacks();
      const inputs = createMockInputs({
        signalingReady$: new BehaviorSubject<boolean>(false)
      });
      const manager = new CallRecoveryManager(callbacks, inputs, FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);

      const reinviteEvents = events.filter((e) => e.action === 'reinvite_started');
      expect(reinviteEvents).toHaveLength(0);

      manager.destroy();
    });

    it('should block recovery when call is not connected', async () => {
      const callbacks = createMockCallbacks({ isCallConnected: vi.fn().mockReturnValue(false) });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);

      const reinviteEvents = events.filter((e) => e.action === 'reinvite_started');
      expect(reinviteEvents).toHaveLength(0);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Tiered recovery: Tier 1 (keyframe) -> Tier 2 (ICE) -> Tier 3 (relay)
  // -----------------------------------------------------------------------

  describe('tiered recovery', () => {
    it('should execute keyframe request as Tier 1', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(events.find((e) => e.action === 'keyframe_requested')).toBeDefined();

      manager.destroy();
    });

    it('should execute ICE restart as Tier 2 after keyframe', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(false);
      expect(events.find((e) => e.action === 'reinvite_started')).toBeDefined();
      expect(events.find((e) => e.action === 'reinvite_succeeded')).toBeDefined();

      manager.destroy();
    });

    it('should escalate to Tier 3 relay-only when Tier 2 fails', async () => {
      let callCount = 0;
      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockImplementation((relayOnly?: boolean) => {
          callCount += 1;
          // First call (standard) fails, second call (relay) succeeds
          if (!relayOnly) {
            return Promise.resolve(false);
          }
          return Promise.resolve(true);
        })
      });

      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Should have been called twice: once standard, once relay
      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(false);
      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(true);

      const succeeded = events.filter((e) => e.action === 'reinvite_succeeded');
      expect(succeeded).toHaveLength(1);
      expect(succeeded[0].reason).toContain('relay');

      manager.destroy();
    });

    it('should emit max_attempts_reached when all tiers fail', async () => {
      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockResolvedValue(false)
      });
      const config: RecoveryConfig = {
        ...FAST_CONFIG,
        maxAttempts: 2,
        enableRelayFallback: true
      };

      const manager = new CallRecoveryManager(callbacks, createMockInputs(), config);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(config.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      const maxReached = events.find((e) => e.action === 'max_attempts_reached');
      expect(maxReached).toBeDefined();
      expect(maxReached!.attempt).toBe(2);
      expect(maxReached!.maxAttempts).toBe(2);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Degradation-only issue routing
  // -----------------------------------------------------------------------

  describe('degradation-only issue routing', () => {
    it('should only execute keyframe (Tier 1) for high_rtt triggers', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.pushTrigger(makeTrigger('stats', 'high_rtt: critical', 'high_rtt'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should only execute keyframe (Tier 1) for high_jitter triggers', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.pushTrigger(makeTrigger('stats', 'high_jitter: critical', 'high_jitter'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should only execute keyframe (Tier 1) for high_packet_loss triggers', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.pushTrigger(makeTrigger('stats', 'high_packet_loss: critical', 'high_packet_loss'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should execute full tiered recovery for no_inbound_audio triggers', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.pushTrigger(makeTrigger('stats', 'no_inbound_audio: critical', 'no_inbound_audio'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(false);

      manager.destroy();
    });

    it('should execute full tiered recovery for ice_disconnected triggers', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.pushTrigger(makeTrigger('stats', 'ice_disconnected: critical', 'ice_disconnected'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(false);

      manager.destroy();
    });

    it('should execute full tiered recovery when issueType is not set', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // No issueType — legacy/network triggers should get full pipeline
      manager.pushTrigger(makeTrigger('network', 'full_reconnect_after_ws'));
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(1);
      expect(callbacks.requestIceRestart).toHaveBeenCalledWith(false);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Keyframe throttling
  // -----------------------------------------------------------------------

  describe('keyframe throttling', () => {
    it('should allow burst up to max within window', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe();

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(3);

      manager.destroy();
    });

    it('should block keyframes after burst limit until cooldown expires', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Exhaust burst
      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe();

      // 4th should be blocked (enters cooldown)
      manager.requestKeyframe();
      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(3);

      // 5th should also be blocked (cooldown active)
      manager.requestKeyframe();
      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(3);

      manager.destroy();
    });

    it('should allow keyframes again after cooldown expires', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Exhaust burst
      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe();
      // Triggers cooldown
      manager.requestKeyframe();

      // Advance past cooldown
      vi.advanceTimersByTime(FAST_CONFIG.keyframeCooldownMs! + 10);

      manager.requestKeyframe();
      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(4);

      manager.destroy();
    });

    it('should reset burst counter after burst window expires', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.requestKeyframe();
      manager.requestKeyframe();

      // Advance past burst window (but not cooldown)
      vi.advanceTimersByTime(FAST_CONFIG.keyframeBurstWindowMs! + 10);

      // Should be able to do full burst again
      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe();

      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(5);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // ICE restart timeout
  // -----------------------------------------------------------------------

  describe('ICE restart timeout', () => {
    it('should emit reinvite_timeout when ICE restart exceeds timeout', async () => {
      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        )
      });

      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.pushTrigger(makeTrigger());

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      // Advance past ICE restart timeout
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.iceRestartTimeoutMs! + 10);
      // Let second timeout fire too (relay)
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.iceRestartTimeoutMs! + 10);

      const timeoutEvents = events.filter((e) => e.action === 'reinvite_timeout');
      expect(timeoutEvents.length).toBeGreaterThanOrEqual(1);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Recovery state transitions
  // -----------------------------------------------------------------------

  describe('state transitions', () => {
    it('should transition idle -> debouncing -> recovering -> cooldown -> idle', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const states = collectStates(manager);

      manager.pushTrigger(makeTrigger());

      // Should be debouncing now
      expect(manager.recoveryState).toBe('debouncing');

      // Advance past debounce (into recovery)
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Should have gone to cooldown
      expect(manager.recoveryState).toBe('cooldown');

      // Advance past cooldown
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.cooldownMs! + 10);

      expect(manager.recoveryState).toBe('idle');

      // Verify full state flow was captured
      expect(states).toContain('idle');
      expect(states).toContain('debouncing');
      expect(states).toContain('recovering');
      expect(states).toContain('cooldown');

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  describe('reset', () => {
    it('should clear attempt counters and return to idle', async () => {
      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockResolvedValue(false)
      });

      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Trigger recovery to increment counters
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Reset
      manager.reset();

      expect(manager.recoveryState).toBe('idle');

      // After reset, a new trigger should work again
      const events = collectEvents(manager);
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      const reinvites = events.filter((e) => e.action === 'reinvite_started');
      expect(reinvites.length).toBeGreaterThanOrEqual(1);

      manager.destroy();
    });

    it('should clear keyframe burst state', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Exhaust burst
      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe();
      manager.requestKeyframe(); // triggers cooldown

      // Reset clears state
      manager.reset();

      // Should allow keyframe again immediately
      manager.requestKeyframe();
      expect(callbacks.requestKeyframe).toHaveBeenCalledTimes(4);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Manual requestIceRestart bypasses cooldown
  // -----------------------------------------------------------------------

  describe('manual requestIceRestart', () => {
    it('should bypass cooldown and gate checks', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      // Trigger recovery to enter cooldown
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Now in cooldown — manual request should still work
      expect(manager.recoveryState).toBe('cooldown');

      await manager.requestIceRestart();

      const reinvites = events.filter((e) => e.action === 'reinvite_started');
      // At least 2: one from pipeline, one from manual
      expect(reinvites.length).toBeGreaterThanOrEqual(2);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Graceful degradation
  // -----------------------------------------------------------------------

  describe('graceful degradation', () => {
    it('should disable video when bandwidth drops below threshold', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.reportBandwidth(100);

      expect(manager.bandwidthConstrained).toBe(true);
      expect(callbacks.disableVideo).toHaveBeenCalledTimes(1);
      expect(events.find((e) => e.action === 'video_disabled')).toBeDefined();

      manager.destroy();
    });

    it('should re-enable video when bandwidth recovers above recovery threshold', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      // First: constrain
      manager.reportBandwidth(100);
      expect(manager.bandwidthConstrained).toBe(true);

      // Then: recover
      manager.reportBandwidth(350);
      expect(manager.bandwidthConstrained).toBe(false);
      expect(callbacks.enableVideo).toHaveBeenCalledTimes(1);
      expect(events.find((e) => e.action === 'video_restored')).toBeDefined();

      manager.destroy();
    });

    it('should not re-enable video when bandwidth is between thresholds (hysteresis)', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.reportBandwidth(100); // constrain
      manager.reportBandwidth(200); // between thresholds — still constrained

      expect(manager.bandwidthConstrained).toBe(true);
      expect(callbacks.enableVideo).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should not disable video when already constrained', () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.reportBandwidth(100);
      manager.reportBandwidth(50);

      expect(callbacks.disableVideo).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    it('should skip degradation when enableAutoDegradation is false', () => {
      const callbacks = createMockCallbacks();
      const config: RecoveryConfig = { ...FAST_CONFIG, enableAutoDegradation: false };
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), config);

      manager.reportBandwidth(50);

      expect(manager.bandwidthConstrained).toBe(false);
      expect(callbacks.disableVideo).not.toHaveBeenCalled();

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Signal-only vs full reconnect (Section 25)
  // -----------------------------------------------------------------------

  describe('WebSocket reconnect handling', () => {
    it('should emit signal_reconnect when peer connection is still connected', () => {
      const callbacks = createMockCallbacks({
        getPeerConnectionState: vi.fn().mockReturnValue('connected')
      });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.handleWebSocketReconnect();

      expect(events.find((e) => e.action === 'signal_reconnect')).toBeDefined();
      expect(manager.recoveryState).toBe('idle');

      manager.destroy();
    });

    it('should emit full_reconnect when peer connection is disconnected', () => {
      const callbacks = createMockCallbacks({
        getPeerConnectionState: vi.fn().mockReturnValue('failed')
      });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);
      const events = collectEvents(manager);

      manager.handleWebSocketReconnect();

      expect(events.find((e) => e.action === 'full_reconnect')).toBeDefined();

      manager.destroy();
    });

    it('should reset counters after WebSocket reconnect', async () => {
      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockResolvedValue(false)
      });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Exhaust attempts
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Reconnect resets counters
      (callbacks.getPeerConnectionState as ReturnType<typeof vi.fn>).mockReturnValue('connected');
      manager.handleWebSocketReconnect();

      expect(manager.recoveryState).toBe('idle');

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Cooldown enforcement
  // -----------------------------------------------------------------------

  describe('cooldown', () => {
    it('should block pipeline triggers during cooldown', async () => {
      // Use a longer cooldown so the second trigger's debounce fires
      // while cooldown is still active.
      const longCooldownConfig: RecoveryConfig = {
        ...FAST_CONFIG,
        cooldownMs: 500
      };
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), longCooldownConfig);

      // First recovery
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(longCooldownConfig.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);

      // Now in cooldown — push another trigger
      const eventsBefore = (callbacks.requestIceRestart as ReturnType<typeof vi.fn>).mock.calls
        .length;

      manager.pushTrigger(makeTrigger());
      // Advance past debounce but not past cooldown
      await vi.advanceTimersByTimeAsync(longCooldownConfig.debounceTimeMs! + 10);

      const eventsAfter = (callbacks.requestIceRestart as ReturnType<typeof vi.fn>).mock.calls
        .length;
      expect(eventsAfter).toBe(eventsBefore);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // exhaustMap: drops triggers while recovery is running
  // -----------------------------------------------------------------------

  describe('exhaustMap behavior', () => {
    it('should drop new triggers while recovery is in progress', async () => {
      let resolveRestart: ((v: boolean) => void) | undefined;

      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveRestart = resolve;
            })
        )
      });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // First trigger
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);

      // While first recovery is pending, push more
      manager.pushTrigger(makeTrigger());
      manager.pushTrigger(makeTrigger());

      // Resolve first restart
      resolveRestart?.(true);
      await vi.advanceTimersByTimeAsync(50);

      // requestIceRestart should have been called only once (from first trigger)
      expect(callbacks.requestIceRestart).toHaveBeenCalledTimes(1);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  describe('destroy', () => {
    it('should complete all observables on destroy', () => {
      const manager = new CallRecoveryManager(
        createMockCallbacks(),
        createMockInputs(),
        FAST_CONFIG
      );
      let stateCompleted = false;
      let eventCompleted = false;

      manager.recoveryState$.subscribe({ complete: () => (stateCompleted = true) });
      manager.recoveryEvent$.subscribe({ complete: () => (eventCompleted = true) });

      manager.destroy();

      expect(stateCompleted).toBe(true);
      expect(eventCompleted).toBe(true);
    });

    it('should not process triggers after destroy', async () => {
      const callbacks = createMockCallbacks();
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      manager.destroy();
      manager.pushTrigger(makeTrigger());

      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 100);

      expect(callbacks.requestIceRestart).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Issue 12: Manual requestIceRestart should check if recovery is in progress
  // -----------------------------------------------------------------------

  describe('manual ICE restart race guard (Issue 12)', () => {
    it('should skip manual ICE restart when recovery pipeline is already recovering', async () => {
      let resolveRestart: ((v: boolean) => void) | undefined;

      const callbacks = createMockCallbacks({
        requestIceRestart: vi.fn().mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveRestart = resolve;
            })
        )
      });
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), FAST_CONFIG);

      // Trigger pipeline recovery (slow, won't resolve immediately)
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(FAST_CONFIG.debounceTimeMs! + 10);

      // Now the manager should be in 'recovering' state
      expect(manager.recoveryState).toBe('recovering');

      // Manual ICE restart while already recovering should be skipped
      await manager.requestIceRestart();

      // The pipeline's ICE restart is still pending — only 1 call to requestIceRestart
      // (from the pipeline). The manual one should have been skipped.
      // NOTE: After the fix, manual request should not call requestIceRestart again.
      const callCount = (callbacks.requestIceRestart as ReturnType<typeof vi.fn>).mock.calls.length;

      // Resolve the pending restart
      resolveRestart?.(true);
      await vi.advanceTimersByTimeAsync(50);

      // The manual call should have been a no-op (logged + returned early)
      // Total calls should be from pipeline only (Tier 2 standard call)
      expect(callCount).toBe(1);

      manager.destroy();
    });
  });

  // -----------------------------------------------------------------------
  // Issue 11: Timer subscriptions accumulate in cooldown
  // -----------------------------------------------------------------------

  describe('cooldown subscription cleanup (Issue 11)', () => {
    it('should not accumulate timer subscriptions across multiple cooldowns', async () => {
      const callbacks = createMockCallbacks();
      const config: RecoveryConfig = {
        ...FAST_CONFIG,
        cooldownMs: 200
      };
      const manager = new CallRecoveryManager(callbacks, createMockInputs(), config);
      const states = collectStates(manager);

      // Trigger first recovery + cooldown
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(config.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);
      expect(manager.recoveryState).toBe('cooldown');

      // Wait for cooldown to expire
      await vi.advanceTimersByTimeAsync(config.cooldownMs! + 10);
      expect(manager.recoveryState).toBe('idle');

      // Trigger second recovery + cooldown
      manager.pushTrigger(makeTrigger());
      await vi.advanceTimersByTimeAsync(config.debounceTimeMs! + 10);
      await vi.advanceTimersByTimeAsync(50);
      expect(manager.recoveryState).toBe('cooldown');

      // Wait for cooldown to expire
      await vi.advanceTimersByTimeAsync(config.cooldownMs! + 10);
      expect(manager.recoveryState).toBe('idle');

      // Count how many times state went to 'idle' — should be exactly the
      // expected transitions, not extra from leaked timer subscriptions
      const idleTransitions = states.filter((s) => s === 'idle');
      // idle (initial) -> debouncing -> recovering -> cooldown -> idle -> debouncing -> recovering -> cooldown -> idle
      // That's 3 idle states total
      expect(idleTransitions.length).toBe(3);

      manager.destroy();
    });
  });
});
