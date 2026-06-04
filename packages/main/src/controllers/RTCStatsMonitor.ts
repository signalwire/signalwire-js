/**
 * RTCStatsMonitor — per-call WebRTC stats polling, baseline calculation,
 * and network issue detection (audio/video packets, RTT, jitter, packet loss).
 *
 * Extends Destroyable for automatic RxJS cleanup.
 */

import {
  map,
  distinctUntilChanged,
  takeUntil,
  interval,
  switchMap,
  from,
  filter,
  EMPTY,
  catchError,
  scan,
  take,
  toArray,
  mergeMap
} from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NetworkIssue {
  type:
    | 'no_inbound_audio'
    | 'no_inbound_video'
    | 'high_rtt'
    | 'high_packet_loss'
    | 'high_jitter'
    | 'ice_disconnected';
  severity: 'warning' | 'critical';
  timestamp: number;
  value?: number;
  threshold?: number;
}

export interface NetworkMetrics {
  timestamp: number;
  audio: {
    packetsReceived: number;
    packetsLost: number;
    jitter: number;
  };
  video: {
    packetsReceived: number;
    packetsLost: number;
  };
  roundTripTime: number;
  availableOutgoingBitrate?: number;
}

export interface RTCStatsMonitorConfig {
  /** Polling interval in milliseconds. */
  pollingIntervalMs?: number;
  /** Number of initial samples used to build baselines. */
  baselineSamples?: number;
  /** Max duration (ms) of no inbound audio packets before critical. */
  noAudioPacketThresholdMs?: number;
  /** Max duration (ms) of no inbound video packets before warning. */
  noVideoPacketThresholdMs?: number;
  /** RTT multiplier over baseline for warning. */
  rttSpikeWarningMultiplier?: number;
  /** RTT multiplier over baseline for critical. */
  rttSpikeCriticalMultiplier?: number;
  /** Packet-loss percentage for warning (e.g. 5 means 5%). */
  packetLossWarningPercent?: number;
  /** Packet-loss percentage for critical. */
  packetLossCriticalPercent?: number;
  /** Jitter multiplier over baseline for warning. */
  jitterSpikeMultiplier?: number;
  /** Rolling history window in seconds. */
  historyWindowSeconds?: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_POLLING_INTERVAL_MS = 1000;
const DEFAULT_BASELINE_SAMPLES = 10;
const DEFAULT_NO_AUDIO_PACKET_THRESHOLD_MS = 2000;
const DEFAULT_NO_VIDEO_PACKET_THRESHOLD_MS = 3000;
const DEFAULT_RTT_SPIKE_WARNING_MULTIPLIER = 3;
const DEFAULT_RTT_SPIKE_CRITICAL_MULTIPLIER = 5;
const DEFAULT_PACKET_LOSS_WARNING_PERCENT = 5;
const DEFAULT_PACKET_LOSS_CRITICAL_PERCENT = 10;
const DEFAULT_JITTER_SPIKE_MULTIPLIER = 4;
const DEFAULT_HISTORY_WINDOW_SECONDS = 30;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RawSample {
  audioPacketsReceived: number;
  audioPacketsLost: number;
  audioJitter: number;
  videoPacketsReceived: number;
  videoPacketsLost: number;
  roundTripTime: number;
  availableOutgoingBitrate: number | undefined;
  timestamp: number;
}

interface Baseline {
  rtt: number;
  jitter: number;
  ready: boolean;
}

function computePacketLossPercent(lost: number, received: number): number {
  const total = lost + received;
  if (total === 0) {
    return 0;
  }
  return (lost / total) * 100;
}

// Typed subsets of W3C RTCStats — only the fields we actually read.

interface InboundRtpStat {
  type: 'inbound-rtp';
  kind: 'audio' | 'video';
  packetsReceived?: number;
  packetsLost?: number;
  jitter?: number;
}

interface CandidatePairStat {
  type: 'candidate-pair';
  state: string;
  nominated?: boolean;
  currentRoundTripTime?: number;
  availableOutgoingBitrate?: number;
}

function isInboundRtpStat(stat: unknown): stat is InboundRtpStat {
  return typeof stat === 'object' && stat !== null && 'type' in stat && stat.type === 'inbound-rtp';
}

function isCandidatePairStat(stat: unknown): stat is CandidatePairStat {
  return (
    typeof stat === 'object' && stat !== null && 'type' in stat && stat.type === 'candidate-pair'
  );
}

// ---------------------------------------------------------------------------
// RTCStatsMonitor
// ---------------------------------------------------------------------------

export class RTCStatsMonitor extends Destroyable {
  // Config (immutable after construction)
  private readonly pollingIntervalMs: number;
  private readonly baselineSampleCount: number;
  private readonly noAudioPacketThresholdMs: number;
  private readonly noVideoPacketThresholdMs: number;
  private readonly rttSpikeWarningMultiplier: number;
  private readonly rttSpikeCriticalMultiplier: number;
  private readonly packetLossWarningPercent: number;
  private readonly packetLossCriticalPercent: number;
  private readonly jitterSpikeMultiplier: number;
  private readonly historyWindowSeconds: number;

  // Polling state
  private running = false;

  // Packet-tracking for "no packets" detection
  private lastAudioPacketsReceived = 0;
  private lastAudioPacketChangeTime = 0;
  private lastVideoPacketsReceived = 0;
  private lastVideoPacketChangeTime = 0;
  private lastRoundTripTime = 0;
  private lastAvailableOutgoingBitrate: number | undefined = undefined;

  // Subjects
  private _sample$ = this.createReplaySubject<RawSample>(1);
  private _baseline$ = this.createBehaviorSubject<Baseline>({ rtt: 0, jitter: 0, ready: false });
  private _networkIssues$ = this.createBehaviorSubject<NetworkIssue[]>([]);
  private _networkMetrics$ = this.createBehaviorSubject<NetworkMetrics[]>([]);

  constructor(
    private readonly peerConnection: RTCPeerConnection,
    config: RTCStatsMonitorConfig = {}
  ) {
    super();

    this.pollingIntervalMs = config.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS;
    this.baselineSampleCount = config.baselineSamples ?? DEFAULT_BASELINE_SAMPLES;
    this.noAudioPacketThresholdMs =
      config.noAudioPacketThresholdMs ?? DEFAULT_NO_AUDIO_PACKET_THRESHOLD_MS;
    this.noVideoPacketThresholdMs =
      config.noVideoPacketThresholdMs ?? DEFAULT_NO_VIDEO_PACKET_THRESHOLD_MS;
    this.rttSpikeWarningMultiplier =
      config.rttSpikeWarningMultiplier ?? DEFAULT_RTT_SPIKE_WARNING_MULTIPLIER;
    this.rttSpikeCriticalMultiplier =
      config.rttSpikeCriticalMultiplier ?? DEFAULT_RTT_SPIKE_CRITICAL_MULTIPLIER;
    this.packetLossWarningPercent =
      config.packetLossWarningPercent ?? DEFAULT_PACKET_LOSS_WARNING_PERCENT;
    this.packetLossCriticalPercent =
      config.packetLossCriticalPercent ?? DEFAULT_PACKET_LOSS_CRITICAL_PERCENT;
    this.jitterSpikeMultiplier = config.jitterSpikeMultiplier ?? DEFAULT_JITTER_SPIKE_MULTIPLIER;
    this.historyWindowSeconds = config.historyWindowSeconds ?? DEFAULT_HISTORY_WINDOW_SECONDS;
  }

  // -----------------------------------------------------------------------
  // Public observables
  // -----------------------------------------------------------------------

  /** Current list of detected network issues (empty array = healthy). */
  public get networkIssues$(): Observable<NetworkIssue[]> {
    return this._networkIssues$.asObservable();
  }

  /** Snapshot of current issues (defensive copy). */
  public get networkIssues(): NetworkIssue[] {
    return [...this._networkIssues$.value];
  }

  /** Simple boolean health indicator. */
  public get isNetworkHealthy$(): Observable<boolean> {
    return this.cachedObservable('isNetworkHealthy$', () =>
      this._networkIssues$.pipe(
        map((issues) => issues.length === 0),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Whether the network is currently healthy. */
  public get isNetworkHealthy(): boolean {
    return this._networkIssues$.value.length === 0;
  }

  /** Rolling metrics history. */
  public get networkMetrics$(): Observable<NetworkMetrics[]> {
    return this._networkMetrics$.asObservable();
  }

  /** Snapshot of rolling metrics (defensive copy). */
  public get networkMetrics(): NetworkMetrics[] {
    return [...this._networkMetrics$.value];
  }

  /** Emits individual critical issues for the recovery pipeline. */
  public get criticalIssue$(): Observable<NetworkIssue> {
    return this.cachedObservable('criticalIssue$', () =>
      this._networkIssues$.pipe(
        mergeMap((issues) => from(issues.filter((i) => i.severity === 'critical'))),
        takeUntil(this.destroyed$)
      )
    );
  }

  /** Emits each raw stats sample extracted from the peer connection. */
  public get sample$(): Observable<RawSample> {
    return this._sample$.asObservable();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    const now = Date.now();
    this.lastAudioPacketChangeTime = now;
    this.lastVideoPacketChangeTime = now;

    logger.debug('[RTCStatsMonitor] Starting stats monitoring');

    // Poll peer connection stats on a fixed interval → extract raw samples
    this.subscribeTo(
      interval(this.pollingIntervalMs).pipe(
        filter(() => this.running),
        switchMap(() =>
          from(this.peerConnection.getStats()).pipe(
            catchError((err) => {
              logger.warn('[RTCStatsMonitor] Failed to get stats:', err);
              return EMPTY;
            })
          )
        ),
        filter(() => this.running),
        map((report) => this.extractSample(report))
      ),
      (sample) => this._sample$.next(sample)
    );

    // Baseline: collect first N samples, compute averages, emit once
    this.subscribeTo(
      this._sample$.pipe(
        take(this.baselineSampleCount),
        toArray(),
        map((samples) => ({
          rtt: samples.reduce((s, b) => s + b.roundTripTime, 0) / samples.length,
          jitter: samples.reduce((s, b) => s + b.audioJitter, 0) / samples.length,
          ready: true as const
        }))
      ),
      (baseline) => {
        logger.debug(
          `[RTCStatsMonitor] Baseline established: rtt=${baseline.rtt.toFixed(1)}ms, jitter=${baseline.jitter.toFixed(1)}ms`
        );
        this._baseline$.next(baseline);
      }
    );

    // Issue detection: carry previous sample via scan for delta-based packet loss
    this.subscribeTo(
      this._sample$.pipe(
        scan((acc, sample) => ({ prev: acc.current, current: sample }), {
          prev: null as RawSample | null,
          current: null as RawSample | null
        }),
        filter(
          (pair): pair is { prev: RawSample | null; current: RawSample } => pair.current !== null
        )
      ),
      ({ prev, current }) => {
        const now = current.timestamp;
        this.updatePacketTracking(current, now);
        const issues = this.detectIssues(current, prev, now);
        this._networkIssues$.next(issues);
      }
    );

    // Rolling metrics history via scan accumulator
    this.subscribeTo(
      this._sample$.pipe(
        scan((history, sample) => {
          const cutoff = sample.timestamp - this.historyWindowSeconds * 1000;
          const metrics: NetworkMetrics = {
            timestamp: sample.timestamp,
            audio: {
              packetsReceived: sample.audioPacketsReceived,
              packetsLost: sample.audioPacketsLost,
              jitter: sample.audioJitter
            },
            video: {
              packetsReceived: sample.videoPacketsReceived,
              packetsLost: sample.videoPacketsLost
            },
            roundTripTime: sample.roundTripTime,
            availableOutgoingBitrate: sample.availableOutgoingBitrate
          };
          return [...history.filter((m) => m.timestamp > cutoff), metrics];
        }, [] as NetworkMetrics[])
      ),
      (metrics) => this._networkMetrics$.next(metrics)
    );
  }

  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    logger.debug('[RTCStatsMonitor] Stopping stats monitoring');
  }

  public override destroy(): void {
    logger.debug('[RTCStatsMonitor] Destroying RTCStatsMonitor');
    this.stop();
    super.destroy();
  }

  // -----------------------------------------------------------------------
  // Sample extraction
  // -----------------------------------------------------------------------

  private extractSample(report: RTCStatsReport): RawSample {
    let audioPacketsReceived = 0;
    let audioPacketsLost = 0;
    let audioJitter = 0;
    let videoPacketsReceived = 0;
    let videoPacketsLost = 0;
    let roundTripTime = 0;
    let availableOutgoingBitrate: number | undefined;

    report.forEach((stat: unknown) => {
      if (isInboundRtpStat(stat)) {
        if (stat.kind === 'audio') {
          // Accumulate across all audio inbound-rtp entries
          audioPacketsReceived += stat.packetsReceived ?? 0;
          audioPacketsLost += stat.packetsLost ?? 0;
          audioJitter = Math.max(audioJitter, (stat.jitter ?? 0) * 1000); // seconds → ms, take worst
        } else {
          // Accumulate across all video inbound-rtp entries (simulcast layers)
          videoPacketsReceived += stat.packetsReceived ?? 0;
          videoPacketsLost += stat.packetsLost ?? 0;
        }
      }

      if (isCandidatePairStat(stat) && stat.state === 'succeeded' && stat.nominated) {
        roundTripTime = stat.currentRoundTripTime
          ? stat.currentRoundTripTime * 1000
          : this.lastRoundTripTime; // seconds → ms
        availableOutgoingBitrate =
          stat.availableOutgoingBitrate ?? this.lastAvailableOutgoingBitrate;
      }
    });

    return {
      audioPacketsReceived,
      audioPacketsLost,
      audioJitter,
      videoPacketsReceived,
      videoPacketsLost,
      roundTripTime,
      availableOutgoingBitrate,
      timestamp: Date.now()
    };
  }

  // -----------------------------------------------------------------------
  // Packet tracking
  // -----------------------------------------------------------------------

  private updatePacketTracking(sample: RawSample, now: number): void {
    if (sample.audioPacketsReceived !== this.lastAudioPacketsReceived) {
      this.lastAudioPacketsReceived = sample.audioPacketsReceived;
      this.lastAudioPacketChangeTime = now;
    }

    if (sample.videoPacketsReceived !== this.lastVideoPacketsReceived) {
      this.lastVideoPacketsReceived = sample.videoPacketsReceived;
      this.lastVideoPacketChangeTime = now;
    }

    if (sample.roundTripTime > 0) {
      this.lastRoundTripTime = sample.roundTripTime;
    }
    if (sample.availableOutgoingBitrate !== undefined) {
      this.lastAvailableOutgoingBitrate = sample.availableOutgoingBitrate;
    }
  }

  // -----------------------------------------------------------------------
  // Issue detection
  // -----------------------------------------------------------------------

  private detectIssues(
    sample: RawSample,
    prevSample: RawSample | null,
    now: number
  ): NetworkIssue[] {
    const issues: NetworkIssue[] = [];
    const baseline = this._baseline$.value;

    // --- No inbound audio packets ---
    const audioSilenceMs = now - this.lastAudioPacketChangeTime;
    if (audioSilenceMs > this.noAudioPacketThresholdMs) {
      issues.push({
        type: 'no_inbound_audio',
        severity: 'critical',
        timestamp: now,
        value: audioSilenceMs,
        threshold: this.noAudioPacketThresholdMs
      });
    }

    // --- No inbound video packets ---
    const videoSilenceMs = now - this.lastVideoPacketChangeTime;
    if (videoSilenceMs > this.noVideoPacketThresholdMs) {
      issues.push({
        type: 'no_inbound_video',
        severity: 'warning',
        timestamp: now,
        value: videoSilenceMs,
        threshold: this.noVideoPacketThresholdMs
      });
    }

    // Baseline-dependent checks
    if (baseline.ready) {
      // --- RTT spike ---
      const rtt = sample.roundTripTime;
      const baselineRtt = baseline.rtt;
      if (baselineRtt > 0) {
        const rttRatio = rtt / baselineRtt;
        if (rttRatio > this.rttSpikeCriticalMultiplier) {
          issues.push({
            type: 'high_rtt',
            severity: 'critical',
            timestamp: now,
            value: rtt,
            threshold: baselineRtt * this.rttSpikeCriticalMultiplier
          });
        } else if (rttRatio > this.rttSpikeWarningMultiplier) {
          issues.push({
            type: 'high_rtt',
            severity: 'warning',
            timestamp: now,
            value: rtt,
            threshold: baselineRtt * this.rttSpikeWarningMultiplier
          });
        }
      }

      // --- Jitter spike ---
      const jitter = sample.audioJitter;
      const baselineJitter = baseline.jitter;
      if (baselineJitter > 0) {
        const jitterRatio = jitter / baselineJitter;
        if (jitterRatio > this.jitterSpikeMultiplier) {
          issues.push({
            type: 'high_jitter',
            severity: 'warning',
            timestamp: now,
            value: jitter,
            threshold: baselineJitter * this.jitterSpikeMultiplier
          });
        }
      }
    }

    // --- Packet loss (delta-based via previous sample) ---
    if (prevSample) {
      // Clamp deltas to 0 — counters can reset to lower values after ICE restart
      const deltaAudioReceived = Math.max(
        0,
        sample.audioPacketsReceived - prevSample.audioPacketsReceived
      );
      const deltaAudioLost = Math.max(0, sample.audioPacketsLost - prevSample.audioPacketsLost);
      const deltaVideoReceived = Math.max(
        0,
        sample.videoPacketsReceived - prevSample.videoPacketsReceived
      );
      const deltaVideoLost = Math.max(0, sample.videoPacketsLost - prevSample.videoPacketsLost);

      const totalDeltaReceived = deltaAudioReceived + deltaVideoReceived;
      const totalDeltaLost = deltaAudioLost + deltaVideoLost;
      const lossPercent = computePacketLossPercent(totalDeltaLost, totalDeltaReceived);

      if (lossPercent > this.packetLossCriticalPercent) {
        issues.push({
          type: 'high_packet_loss',
          severity: 'critical',
          timestamp: now,
          value: lossPercent,
          threshold: this.packetLossCriticalPercent
        });
      } else if (lossPercent > this.packetLossWarningPercent) {
        issues.push({
          type: 'high_packet_loss',
          severity: 'warning',
          timestamp: now,
          value: lossPercent,
          threshold: this.packetLossWarningPercent
        });
      }
    }

    return issues;
  }
}
