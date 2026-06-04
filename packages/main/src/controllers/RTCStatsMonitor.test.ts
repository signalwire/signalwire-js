import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RTCStatsMonitor } from './RTCStatsMonitor';

import type { RTCStatsMonitorConfig, NetworkIssue, NetworkMetrics } from './RTCStatsMonitor';

// ---------------------------------------------------------------------------
// Mock RTCStatsReport helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake RTCStatsReport from a plain object map of id → stat.
 * Mirrors the real Map-like API that getStats() returns.
 */
function createStatsReport(entries: Record<string, Record<string, unknown>>): RTCStatsReport {
  const map = new Map(Object.entries(entries));
  return {
    forEach: (
      cb: (value: Record<string, unknown>, key: string, parent: RTCStatsReport) => void
    ) => {
      map.forEach((v, k) => cb(v, k, undefined as unknown as RTCStatsReport));
    },
    get: (key: string) => map.get(key),
    has: (key: string) => map.has(key),
    entries: () => map.entries(),
    keys: () => map.keys(),
    values: () => map.values(),
    [Symbol.iterator]: () => map[Symbol.iterator](),
    size: map.size
  } as unknown as RTCStatsReport;
}

/** Convenience: returns a "healthy" stats report with incrementing packets. */
function healthyReport(
  audioPackets: number,
  videoPackets: number,
  rttSeconds = 0.05,
  jitterSeconds = 0.005
): RTCStatsReport {
  return createStatsReport({
    'inbound-audio': {
      type: 'inbound-rtp',
      kind: 'audio',
      packetsReceived: audioPackets,
      packetsLost: 0,
      jitter: jitterSeconds
    },
    'inbound-video': {
      type: 'inbound-rtp',
      kind: 'video',
      packetsReceived: videoPackets,
      packetsLost: 0
    },
    'candidate-pair-1': {
      type: 'candidate-pair',
      state: 'succeeded',
      nominated: true,
      currentRoundTripTime: rttSeconds,
      availableOutgoingBitrate: 2_500_000
    }
  });
}

// ---------------------------------------------------------------------------
// Mock PeerConnection
// ---------------------------------------------------------------------------

function createMockPeerConnection(getStatsFn?: () => Promise<RTCStatsReport>): RTCPeerConnection {
  const defaultGetStats = () => Promise.resolve(healthyReport(100, 50));
  return {
    getStats: vi.fn(getStatsFn ?? defaultGetStats)
  } as unknown as RTCPeerConnection;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RTCStatsMonitor', () => {
  let monitor: RTCStatsMonitor;
  let pc: RTCPeerConnection;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    monitor?.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe('Lifecycle', () => {
    it('should create with default config', () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc);
      expect(monitor).toBeDefined();
    });

    it('should create with custom config', () => {
      pc = createMockPeerConnection();
      const config: RTCStatsMonitorConfig = {
        pollingIntervalMs: 500,
        baselineSamples: 5,
        noAudioPacketThresholdMs: 3000,
        noVideoPacketThresholdMs: 5000,
        rttSpikeWarningMultiplier: 2,
        rttSpikeCriticalMultiplier: 4,
        packetLossWarningPercent: 3,
        packetLossCriticalPercent: 8,
        jitterSpikeMultiplier: 3,
        historyWindowSeconds: 60
      };
      monitor = new RTCStatsMonitor(pc, config);
      expect(monitor).toBeDefined();
    });

    it('should not poll before start() is called', async () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc);

      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      expect(pc.getStats).not.toHaveBeenCalled();
    });

    it('should poll after start() is called', async () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc, { pollingIntervalMs: 1000 });

      monitor.start();
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);

      expect(pc.getStats).toHaveBeenCalledTimes(1);
    });

    it('should stop polling on stop()', async () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc, { pollingIntervalMs: 1000 });

      monitor.start();
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);
      expect(pc.getStats).toHaveBeenCalledTimes(1);

      monitor.stop();
      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(0);

      // Should still be 1 — no more polls after stop
      expect(pc.getStats).toHaveBeenCalledTimes(1);
    });

    it('should stop polling on destroy()', async () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc, { pollingIntervalMs: 1000 });

      monitor.start();
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);

      monitor.destroy();
      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(0);

      expect(pc.getStats).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent for repeated start() calls', async () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc, { pollingIntervalMs: 1000 });

      monitor.start();
      monitor.start(); // second call should be a no-op
      vi.advanceTimersByTime(1000);
      await vi.advanceTimersByTimeAsync(0);

      // Only one interval should have been created
      expect(pc.getStats).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent for repeated stop() calls', () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc);

      monitor.stop(); // stop before start — no-op
      monitor.start();
      monitor.stop();
      monitor.stop(); // second stop — no-op

      // Should not throw
    });

    it('should complete observables on destroy', () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc);

      const completions: string[] = [];
      monitor.networkIssues$.subscribe({ complete: () => completions.push('networkIssues$') });
      monitor.networkMetrics$.subscribe({ complete: () => completions.push('networkMetrics$') });

      monitor.destroy();

      expect(completions).toContain('networkIssues$');
      expect(completions).toContain('networkMetrics$');
    });
  });

  // -------------------------------------------------------------------------
  // Baseline building
  // -------------------------------------------------------------------------

  describe('Baseline building', () => {
    it('should build baseline after N samples', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, 0.05, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 5
      });

      monitor.start();

      // Advance through 5 polls
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(pc.getStats).toHaveBeenCalledTimes(5);
      // Baseline should now be ready — further RTT spikes should be detectable
    });

    it('should not detect RTT spikes before baseline is ready', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // On the 3rd call, send a very high RTT — but baseline needs 10 samples
        const rtt = callCount === 3 ? 1.0 : 0.05;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, rtt, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10
      });

      const capturedIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        capturedIssues.push(issues);
      });

      monitor.start();

      // Only 3 polls — baseline not yet ready
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      // No RTT spike issues should exist since baseline is not ready
      const rttIssues = capturedIssues.flat().filter((i) => i.type === 'high_rtt');
      expect(rttIssues).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // No-packet detection
  // -------------------------------------------------------------------------

  describe('No inbound audio packet detection', () => {
    it('should detect no inbound audio packets after threshold', async () => {
      // Always return the same packet count — simulating "stuck" audio
      pc = createMockPeerConnection(() => Promise.resolve(healthyReport(100, 50, 0.05, 0.005)));

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noAudioPacketThresholdMs: 2000,
        baselineSamples: 2
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      // Poll 6 times at 500ms = 3000ms total — exceeds 2000ms threshold
      for (let i = 0; i < 6; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      const audioIssues = allIssues.flat().filter((i) => i.type === 'no_inbound_audio');
      expect(audioIssues.length).toBeGreaterThan(0);
      expect(audioIssues[0].severity).toBe('critical');
    });

    it('should not flag audio issues when packets are increasing', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noAudioPacketThresholdMs: 2000,
        baselineSamples: 2
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 6; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      const audioIssues = allIssues.flat().filter((i) => i.type === 'no_inbound_audio');
      expect(audioIssues).toHaveLength(0);
    });
  });

  describe('No inbound video packet detection', () => {
    it('should detect no inbound video packets after threshold', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // Audio keeps incrementing but video stays stuck at 50
        return Promise.resolve(healthyReport(callCount * 50, 50, 0.05, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noVideoPacketThresholdMs: 3000,
        baselineSamples: 2
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      // Poll 8 times at 500ms = 4000ms total — exceeds 3000ms video threshold
      for (let i = 0; i < 8; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      const videoIssues = allIssues.flat().filter((i) => i.type === 'no_inbound_video');
      expect(videoIssues.length).toBeGreaterThan(0);
      expect(videoIssues[0].severity).toBe('warning');
    });
  });

  // -------------------------------------------------------------------------
  // RTT spike detection
  // -------------------------------------------------------------------------

  describe('RTT spike detection', () => {
    it('should detect RTT warning at 3x baseline', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // First 10 samples: normal 50ms RTT → baseline = 50ms
        // 11th sample: 200ms = 4x baseline → warning
        const rtt = callCount <= 10 ? 0.05 : 0.2;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, rtt, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10,
        rttSpikeWarningMultiplier: 3,
        rttSpikeCriticalMultiplier: 5
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      // Build baseline (10 polls) + 1 spike poll
      for (let i = 0; i < 11; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const rttIssues = allIssues.flat().filter((i) => i.type === 'high_rtt');
      expect(rttIssues.length).toBeGreaterThan(0);
      expect(rttIssues[0].severity).toBe('warning');
    });

    it('should detect RTT critical at 5x baseline', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // First 10 samples: 50ms → baseline = 50ms
        // 11th sample: 300ms = 6x baseline → critical
        const rtt = callCount <= 10 ? 0.05 : 0.3;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, rtt, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10,
        rttSpikeWarningMultiplier: 3,
        rttSpikeCriticalMultiplier: 5
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 11; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const rttIssues = allIssues.flat().filter((i) => i.type === 'high_rtt');
      expect(rttIssues.length).toBeGreaterThan(0);
      expect(rttIssues[0].severity).toBe('critical');
    });

    it('should not detect RTT spike when RTT is within normal range', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // All samples have similar RTT (small variation)
        const rtt = 0.05 + (callCount % 2 === 0 ? 0.01 : 0);
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, rtt, 0.005));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 15; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const rttIssues = allIssues.flat().filter((i) => i.type === 'high_rtt');
      expect(rttIssues).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Packet loss detection
  // -------------------------------------------------------------------------

  describe('Packet loss detection', () => {
    it('should detect packet loss warning above 5%', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // Each poll: audio received +50, audio lost +5, video received +30, video lost +0
        // Delta totals: received=80, lost=5 → loss = 5/(80+5) ≈ 5.88% → warning
        const report = createStatsReport({
          'inbound-audio': {
            type: 'inbound-rtp',
            kind: 'audio',
            packetsReceived: callCount * 50,
            packetsLost: callCount * 5,
            jitter: 0.005
          },
          'inbound-video': {
            type: 'inbound-rtp',
            kind: 'video',
            packetsReceived: callCount * 30,
            packetsLost: 0
          },
          'candidate-pair-1': {
            type: 'candidate-pair',
            state: 'succeeded',
            nominated: true,
            currentRoundTripTime: 0.05
          }
        });
        return Promise.resolve(report);
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 2,
        packetLossWarningPercent: 5,
        packetLossCriticalPercent: 10
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      // 4 polls — first has no previous sample, then 3 with delta
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const lossIssues = allIssues.flat().filter((i) => i.type === 'high_packet_loss');
      expect(lossIssues.length).toBeGreaterThan(0);
      // Delta loss = 5/(80+5) ≈ 5.88% → should be warning (above 5%, below 10%)
      expect(lossIssues.some((i) => i.severity === 'warning')).toBe(true);
    });

    it('should detect packet loss critical above 10%', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // Delta: received=50, lost ~7 → 7/(50+7) ≈ 12.3%
        const lost = callCount > 1 ? callCount * 7 : 0;
        const report = createStatsReport({
          'inbound-audio': {
            type: 'inbound-rtp',
            kind: 'audio',
            packetsReceived: callCount * 50,
            packetsLost: lost,
            jitter: 0.005
          },
          'inbound-video': {
            type: 'inbound-rtp',
            kind: 'video',
            packetsReceived: callCount * 30,
            packetsLost: 0
          },
          'candidate-pair-1': {
            type: 'candidate-pair',
            state: 'succeeded',
            nominated: true,
            currentRoundTripTime: 0.05
          }
        });
        return Promise.resolve(report);
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 2,
        packetLossWarningPercent: 5,
        packetLossCriticalPercent: 10
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const lossIssues = allIssues.flat().filter((i) => i.type === 'high_packet_loss');
      expect(lossIssues.length).toBeGreaterThan(0);
      expect(lossIssues.some((i) => i.severity === 'critical')).toBe(true);
    });

    it('should not flag packet loss when there is none', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 2
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const lossIssues = allIssues.flat().filter((i) => i.type === 'high_packet_loss');
      expect(lossIssues).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Jitter spike detection
  // -------------------------------------------------------------------------

  describe('Jitter spike detection', () => {
    it('should detect jitter spike above 4x baseline', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // First 10 samples: 5ms jitter → baseline = 5ms
        // 11th sample: 25ms = 5x baseline → warning
        const jitter = callCount <= 10 ? 0.005 : 0.025;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, 0.05, jitter));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10,
        jitterSpikeMultiplier: 4
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 11; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const jitterIssues = allIssues.flat().filter((i) => i.type === 'high_jitter');
      expect(jitterIssues.length).toBeGreaterThan(0);
      expect(jitterIssues[0].severity).toBe('warning');
    });

    it('should not flag jitter within normal range', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // Small jitter variation: 5ms baseline, occasional 10ms (2x, under 4x)
        const jitter = callCount % 3 === 0 ? 0.01 : 0.005;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30, 0.05, jitter));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 10,
        jitterSpikeMultiplier: 4
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 15; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      const jitterIssues = allIssues.flat().filter((i) => i.type === 'high_jitter');
      expect(jitterIssues).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Rolling history window
  // -------------------------------------------------------------------------

  describe('Rolling history window', () => {
    it('should keep metrics within the configured window', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 1000,
        historyWindowSeconds: 5, // 5-second window
        baselineSamples: 2
      });

      monitor.start();

      // Poll 8 times at 1s each = 8 seconds
      for (let i = 0; i < 8; i++) {
        vi.advanceTimersByTime(1000);
        await vi.advanceTimersByTimeAsync(0);
      }

      const history = monitor.networkMetrics;
      // Should have at most ~5 entries (5s window)
      // Timestamps within last 5 seconds of the latest entry
      expect(history.length).toBeLessThanOrEqual(6); // Some tolerance for timing
      expect(history.length).toBeGreaterThan(0);
    });

    it('should trim old entries from history', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 1000,
        historyWindowSeconds: 3, // 3-second window
        baselineSamples: 1
      });

      monitor.start();

      // Poll 10 times at 1s each
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(1000);
        await vi.advanceTimersByTimeAsync(0);
      }

      const history = monitor.networkMetrics;
      // With 3-second window and 1-second intervals, max ~3-4 entries
      expect(history.length).toBeLessThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // Observable behavior
  // -------------------------------------------------------------------------

  describe('Observable behavior', () => {
    it('should emit isNetworkHealthy$ = true when no issues', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 2
      });

      let healthy: boolean | undefined;
      monitor.isNetworkHealthy$.subscribe((v) => {
        healthy = v;
      });

      monitor.start();

      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(healthy).toBe(true);
    });

    it('should emit isNetworkHealthy$ = false when issues exist', async () => {
      // Static packets → no_inbound_audio after threshold
      pc = createMockPeerConnection(() => Promise.resolve(healthyReport(100, 50)));

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noAudioPacketThresholdMs: 1000,
        baselineSamples: 1
      });

      const healthyValues: boolean[] = [];
      monitor.isNetworkHealthy$.subscribe((v) => {
        healthyValues.push(v);
      });

      monitor.start();

      // Exceed audio packet threshold
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(healthyValues).toContain(false);
    });

    it('should emit criticalIssue$ for critical severity issues', async () => {
      // Static packets → will trigger critical no_inbound_audio
      pc = createMockPeerConnection(() => Promise.resolve(healthyReport(100, 50)));

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noAudioPacketThresholdMs: 1000,
        baselineSamples: 1
      });

      const criticalIssues: NetworkIssue[] = [];
      monitor.criticalIssue$.subscribe((issue) => {
        criticalIssues.push(issue);
      });

      monitor.start();

      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(criticalIssues.length).toBeGreaterThan(0);
      expect(criticalIssues[0].severity).toBe('critical');
      expect(criticalIssues[0].type).toBe('no_inbound_audio');
    });

    it('should start with healthy state (empty issues)', () => {
      pc = createMockPeerConnection();
      monitor = new RTCStatsMonitor(pc);

      expect(monitor.networkIssues).toEqual([]);
      expect(monitor.isNetworkHealthy).toBe(true);
      expect(monitor.networkMetrics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Metrics snapshot shape
  // -------------------------------------------------------------------------

  describe('Metrics snapshot', () => {
    it('should produce correctly shaped NetworkMetrics', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(
          createStatsReport({
            'inbound-audio': {
              type: 'inbound-rtp',
              kind: 'audio',
              packetsReceived: 200,
              packetsLost: 5,
              jitter: 0.008
            },
            'inbound-video': {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 120,
              packetsLost: 2
            },
            'candidate-pair-1': {
              type: 'candidate-pair',
              state: 'succeeded',
              nominated: true,
              currentRoundTripTime: 0.04,
              availableOutgoingBitrate: 2_000_000
            }
          })
        );
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 1
      });

      monitor.start();
      vi.advanceTimersByTime(100);
      await vi.advanceTimersByTimeAsync(0);

      const history = monitor.networkMetrics;
      expect(history.length).toBe(1);

      const m = history[0];
      expect(m.audio.packetsReceived).toBe(200);
      expect(m.audio.packetsLost).toBe(5);
      expect(m.audio.jitter).toBeCloseTo(8, 0); // 0.008s → 8ms
      expect(m.video.packetsReceived).toBe(120);
      expect(m.video.packetsLost).toBe(2);
      expect(m.roundTripTime).toBeCloseTo(40, 0); // 0.04s → 40ms
      expect(m.availableOutgoingBitrate).toBe(2_000_000);
      expect(m.timestamp).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe('Error handling', () => {
    it('should gracefully handle getStats() rejection', async () => {
      pc = createMockPeerConnection(() => Promise.reject(new Error('Stats unavailable')));

      monitor = new RTCStatsMonitor(pc, { pollingIntervalMs: 100 });
      monitor.start();

      // Should not throw
      vi.advanceTimersByTime(100);
      await vi.advanceTimersByTimeAsync(0);

      // No metrics should have been recorded
      expect(monitor.networkMetrics).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 6: Defensive copies in snapshot getters
  // -------------------------------------------------------------------------

  describe('Defensive copies (Issue 6)', () => {
    it('should return a defensive copy from networkIssues getter', async () => {
      // Cause a critical issue by keeping packets static
      pc = createMockPeerConnection(() => Promise.resolve(healthyReport(100, 50)));

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 500,
        noAudioPacketThresholdMs: 1000,
        baselineSamples: 1
      });

      monitor.start();

      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(500);
        await vi.advanceTimersByTimeAsync(0);
      }

      const issues = monitor.networkIssues;
      expect(issues.length).toBeGreaterThan(0);

      // Mutating returned array should not affect internal state
      const originalLength = issues.length;
      issues.push({
        type: 'high_rtt',
        severity: 'warning',
        timestamp: Date.now()
      });

      expect(monitor.networkIssues.length).toBe(originalLength);
    });

    it('should return a defensive copy from networkMetrics getter', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        return Promise.resolve(healthyReport(callCount * 50, callCount * 30));
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 1
      });

      monitor.start();
      vi.advanceTimersByTime(100);
      await vi.advanceTimersByTimeAsync(0);

      const metrics = monitor.networkMetrics;
      expect(metrics.length).toBe(1);

      // Mutating returned array should not affect internal state
      metrics.push({
        timestamp: 0,
        audio: { packetsReceived: 0, packetsLost: 0, jitter: 0 },
        video: { packetsReceived: 0, packetsLost: 0 },
        roundTripTime: 0
      });

      expect(monitor.networkMetrics.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 15: Packet loss deltas can go negative after ICE restart
  // -------------------------------------------------------------------------

  describe('Negative packet loss deltas (Issue 15)', () => {
    it('should clamp negative deltas to zero after ICE restart resets counters', async () => {
      let callCount = 0;
      pc = createMockPeerConnection(() => {
        callCount++;
        // First 3 polls: normal increasing packets, NO loss (to avoid triggering loss alerts)
        // Poll 4: counters reset to lower values (simulates ICE restart)
        if (callCount <= 3) {
          return Promise.resolve(
            createStatsReport({
              'inbound-audio': {
                type: 'inbound-rtp',
                kind: 'audio',
                packetsReceived: callCount * 100,
                packetsLost: 0,
                jitter: 0.005
              },
              'inbound-video': {
                type: 'inbound-rtp',
                kind: 'video',
                packetsReceived: callCount * 80,
                packetsLost: 0
              },
              'candidate-pair-1': {
                type: 'candidate-pair',
                state: 'succeeded',
                nominated: true,
                currentRoundTripTime: 0.05
              }
            })
          );
        }
        // After ICE restart: cumulative counters are lower than previous
        return Promise.resolve(
          createStatsReport({
            'inbound-audio': {
              type: 'inbound-rtp',
              kind: 'audio',
              packetsReceived: 10, // much lower than previous 300
              packetsLost: 0,
              jitter: 0.005
            },
            'inbound-video': {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 5, // much lower than previous 240
              packetsLost: 0
            },
            'candidate-pair-1': {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.05
            }
          })
        );
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 2,
        noAudioPacketThresholdMs: 99999, // disable no-packet detection
        noVideoPacketThresholdMs: 99999
      });

      const allIssues: NetworkIssue[][] = [];
      monitor.networkIssues$.subscribe((issues) => {
        allIssues.push(issues);
      });

      monitor.start();

      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(100);
        await vi.advanceTimersByTimeAsync(0);
      }

      // Without clamping: deltaReceived=10-300=-290 would be negative,
      // which could cause computePacketLossPercent to produce nonsense values.
      // With clamping: deltaReceived=max(0,-290)=0, deltaLost=max(0,0)=0 → loss=0%
      const lossIssues = allIssues.flat().filter((i) => i.type === 'high_packet_loss');
      expect(lossIssues).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 19: Simulcast layer handling — accumulate packets across inbound-rtp
  // -------------------------------------------------------------------------

  describe('Simulcast layer accumulation (Issue 19)', () => {
    it('should accumulate packets across all inbound-rtp entries of same kind', async () => {
      pc = createMockPeerConnection(() => {
        return Promise.resolve(
          createStatsReport({
            'inbound-video-low': {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 100,
              packetsLost: 5
            },
            'inbound-video-mid': {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 200,
              packetsLost: 10
            },
            'inbound-video-high': {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 300,
              packetsLost: 15
            },
            'inbound-audio': {
              type: 'inbound-rtp',
              kind: 'audio',
              packetsReceived: 500,
              packetsLost: 2,
              jitter: 0.005
            },
            'candidate-pair-1': {
              type: 'candidate-pair',
              state: 'succeeded',
              nominated: true,
              currentRoundTripTime: 0.05,
              availableOutgoingBitrate: 2_000_000
            }
          })
        );
      });

      monitor = new RTCStatsMonitor(pc, {
        pollingIntervalMs: 100,
        baselineSamples: 1
      });

      monitor.start();
      vi.advanceTimersByTime(100);
      await vi.advanceTimersByTimeAsync(0);

      const metrics = monitor.networkMetrics;
      expect(metrics.length).toBe(1);

      // Video packets should be accumulated: 100+200+300=600 received, 5+10+15=30 lost
      expect(metrics[0].video.packetsReceived).toBe(600);
      expect(metrics[0].video.packetsLost).toBe(30);
      // Audio should still be 500/2
      expect(metrics[0].audio.packetsReceived).toBe(500);
      expect(metrics[0].audio.packetsLost).toBe(2);
    });
  });
});
