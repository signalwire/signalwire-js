import {
  merge,
  debounceTime,
  exhaustMap,
  filter,
  takeUntil,
  timer,
  from,
  EMPTY,
  take,
  tap,
  catchError,
  combineLatest,
  switchMap,
  withLatestFrom,
  map
} from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

// ---------------------------------------------------------------------------
// Constants (sensible defaults)
// ---------------------------------------------------------------------------

const DEFAULT_DEBOUNCE_TIME_MS = 2_000;
const DEFAULT_COOLDOWN_MS = 10_000;
const DEFAULT_ICE_GRACE_PERIOD_MS = 3_000;
const DEFAULT_ICE_RESTART_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;

const DEFAULT_KEYFRAME_MAX_BURST = 3;
const DEFAULT_KEYFRAME_BURST_WINDOW_MS = 3_000;
const DEFAULT_KEYFRAME_COOLDOWN_MS = 10_000;

const DEFAULT_DEGRADATION_BITRATE_THRESHOLD = 150; // kbps
const DEFAULT_DEGRADATION_RECOVERY_THRESHOLD = 300; // kbps
const DEFAULT_PACKET_LOSS_RECOVERY_DELAY_SEC = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecoveryState = 'idle' | 'debouncing' | 'recovering' | 'cooldown';

export interface RecoveryEvent {
  action:
    | 'keyframe_requested'
    | 'reinvite_started'
    | 'reinvite_succeeded'
    | 'reinvite_failed'
    | 'reinvite_timeout'
    | 'max_attempts_reached'
    | 'signal_reconnect'
    | 'full_reconnect'
    | 'video_disabled'
    | 'video_restored';
  reason: string;
  attempt?: number;
  maxAttempts?: number;
  timestamp: number;
}

export interface RecoveryConfig {
  debounceTimeMs?: number;
  cooldownMs?: number;
  iceGracePeriodMs?: number;
  iceRestartTimeoutMs?: number;
  maxAttempts?: number;
  enableRelayFallback?: boolean;
  keyframeMaxBurst?: number;
  keyframeBurstWindowMs?: number;
  keyframeCooldownMs?: number;
  degradationBitrateThreshold?: number;
  degradationRecoveryThreshold?: number;
  enableAutoDegradation?: boolean;
  /** Seconds without packet loss before restoring video after degradation. */
  packetLossRecoveryDelaySec?: number;
}

export interface RecoveryCallbacks {
  requestKeyframe: () => void;
  requestIceRestart: (relayOnly?: boolean) => Promise<boolean>;
  disableVideo: () => void;
  enableVideo: () => void;
  isNegotiating: () => boolean;
  isCallConnected: () => boolean;
  getPeerConnectionState: () => string | null;
}

export interface RecoveryInputs {
  /** Transport-level signaling readiness (true after WebSocket auth, false on disconnect). */
  signalingReady$: Observable<boolean>;
}

export interface RecoveryTrigger {
  source: 'stats' | 'ice' | 'network';
  detail: string;
  /**
   * Structured issue type from the stats monitor or ICE state machine.
   * Used by runTiers() to route degradation-only triggers (high_rtt, high_jitter,
   * high_packet_loss) to Tier 1 only, and connectivity-breaking triggers
   * (no_inbound_audio, ice_disconnected) to the full tiered pipeline.
   */
  issueType?: string;
}

/**
 * Issue types that indicate quality degradation but NOT connectivity loss.
 * These should only trigger Tier 1 (keyframe) — never ICE restart.
 * The network path is slow or lossy, but media is still flowing.
 */
const DEGRADATION_ONLY_ISSUES: ReadonlySet<string> = new Set([
  'high_rtt',
  'high_jitter',
  'high_packet_loss'
]);

// ---------------------------------------------------------------------------
// CallRecoveryManager
// ---------------------------------------------------------------------------

/**
 * Implements the tiered recovery pipeline described in Sections 2, 19, 22,
 * and 25 of the implementation guide.
 *
 * Three detection signals (stats critical, ICE state, network events) are
 * merged, debounced, and processed through tiered recovery:
 *   Tier 1 - Request video keyframe (throttled burst)
 *   Tier 2 - ICE restart via verto.modify
 *   Tier 3 - Relay-only ICE restart
 *
 * Gate checks prevent recovery when the call is not in a recoverable state.
 * A state machine tracks the pipeline: IDLE -> DEBOUNCING -> RECOVERING -> COOLDOWN.
 */
export class CallRecoveryManager extends Destroyable {
  // --- Configuration (immutable after construction) ---
  private readonly _config: Required<RecoveryConfig>;
  private readonly _callbacks: RecoveryCallbacks;
  private readonly _inputs: RecoveryInputs;

  // --- Observables (private subjects) ---
  private readonly _recoveryState$ = this.createBehaviorSubject<RecoveryState>('idle');
  private readonly _recoveryEvent$ = this.createSubject<RecoveryEvent>();
  private readonly _bandwidthConstrained$ = this.createBehaviorSubject<boolean>(false);
  private readonly _hasPacketLoss$ = this.createBehaviorSubject<boolean>(false);

  // --- Input signals (callers push triggers here) ---
  private readonly _trigger$ = this.createSubject<RecoveryTrigger>();

  // --- Internal state ---
  private _attemptCount = 0;
  private _keyframeBurstCount = 0;
  private _keyframeBurstStart = 0;
  private _keyframeCooldownUntil = 0;
  private _cooldownUntil = 0;
  private _cooldownSubscription?: { unsubscribe(): void };

  // --- Pipeline subscription lifecycle ---
  private readonly _pipelineStop$ = this.createSubject<void>();

  constructor(callbacks: RecoveryCallbacks, inputs: RecoveryInputs, config: RecoveryConfig = {}) {
    super();
    this._callbacks = callbacks;
    this._inputs = inputs;
    this._config = {
      debounceTimeMs: config.debounceTimeMs ?? DEFAULT_DEBOUNCE_TIME_MS,
      cooldownMs: config.cooldownMs ?? DEFAULT_COOLDOWN_MS,
      iceGracePeriodMs: config.iceGracePeriodMs ?? DEFAULT_ICE_GRACE_PERIOD_MS,
      iceRestartTimeoutMs: config.iceRestartTimeoutMs ?? DEFAULT_ICE_RESTART_TIMEOUT_MS,
      maxAttempts: config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      enableRelayFallback: config.enableRelayFallback ?? true,
      keyframeMaxBurst: config.keyframeMaxBurst ?? DEFAULT_KEYFRAME_MAX_BURST,
      keyframeBurstWindowMs: config.keyframeBurstWindowMs ?? DEFAULT_KEYFRAME_BURST_WINDOW_MS,
      keyframeCooldownMs: config.keyframeCooldownMs ?? DEFAULT_KEYFRAME_COOLDOWN_MS,
      degradationBitrateThreshold:
        config.degradationBitrateThreshold ?? DEFAULT_DEGRADATION_BITRATE_THRESHOLD,
      degradationRecoveryThreshold:
        config.degradationRecoveryThreshold ?? DEFAULT_DEGRADATION_RECOVERY_THRESHOLD,
      enableAutoDegradation: config.enableAutoDegradation ?? true,
      packetLossRecoveryDelaySec:
        config.packetLossRecoveryDelaySec ?? DEFAULT_PACKET_LOSS_RECOVERY_DELAY_SEC
    };

    this.initPipeline();
    this.initDegradationRecoveryPipeline();
  }

  // --- Public observable getters ---

  public get recoveryState$(): Observable<RecoveryState> {
    return this._recoveryState$.asObservable().pipe(takeUntil(this._destroyed$));
  }

  public get recoveryState(): RecoveryState {
    return this._recoveryState$.value;
  }

  public get recoveryEvent$(): Observable<RecoveryEvent> {
    return this._recoveryEvent$.asObservable().pipe(takeUntil(this._destroyed$));
  }

  public get bandwidthConstrained$(): Observable<boolean> {
    return this._bandwidthConstrained$.asObservable().pipe(takeUntil(this._destroyed$));
  }

  public get bandwidthConstrained(): boolean {
    return this._bandwidthConstrained$.value;
  }

  // --- Public API ---

  /**
   * Feed an external detection signal into the recovery pipeline.
   * Multiple signals are debounced and collapsed automatically.
   */
  public pushTrigger(trigger: RecoveryTrigger): void {
    this._trigger$.next(trigger);
  }

  /**
   * Manual ICE restart request — bypasses cooldown and gate checks,
   * but skips if the pipeline is already recovering to avoid races.
   */
  public async requestIceRestart(): Promise<void> {
    if (this._recoveryState$.value === 'recovering') {
      logger.info('CallRecoveryManager: manual ICE restart skipped — recovery already in progress');
      return;
    }
    logger.info('CallRecoveryManager: manual ICE restart requested');
    this.transitionTo('recovering');
    await this.executeIceRestart(false);
    this.startCooldown();
  }

  /**
   * Manual keyframe request — subject to burst throttling only.
   */
  public requestKeyframe(): void {
    this.executeKeyframe('manual request');
  }

  /**
   * Reset all attempt counters and cooldowns. Should be called after
   * WebSocket reconnect or call state recovers to 'connected'.
   */
  public reset(): void {
    logger.info('CallRecoveryManager: resetting counters');
    this._attemptCount = 0;
    this._keyframeBurstCount = 0;
    this._keyframeBurstStart = 0;
    this._keyframeCooldownUntil = 0;
    this._cooldownUntil = 0;
    this.transitionTo('idle');
  }

  /**
   * Notify the recovery manager that a verto.modify (ICE restart SDP exchange)
   * failed at the signaling layer. Resets cooldown and pushes a new trigger
   * so recovery can re-attempt.
   */
  public notifyModifyFailed(): void {
    if (this._recoveryState$.value === 'cooldown' || this._recoveryState$.value === 'idle') {
      logger.info('CallRecoveryManager: verto.modify failed — re-entering recovery');
      this._cooldownUntil = 0;
      this.transitionTo('idle');
      this.pushTrigger({ source: 'network', detail: 'modify_failed_during_recovery' });
    }
  }

  /**
   * Feed bandwidth information for graceful degradation (Section 22).
   * Call this from the stats monitor with current available outgoing bitrate.
   */
  public reportBandwidth(bitrateKbps: number): void {
    if (!this._config.enableAutoDegradation) {
      return;
    }

    const wasConstrained = this._bandwidthConstrained$.value;

    if (!wasConstrained && bitrateKbps < this._config.degradationBitrateThreshold) {
      this._bandwidthConstrained$.next(true);
      this._callbacks.disableVideo();
      this.emitEvent({
        action: 'video_disabled',
        reason: `bandwidth ${bitrateKbps}kbps below threshold ${this._config.degradationBitrateThreshold}kbps`,
        timestamp: Date.now()
      });
      logger.warn(
        `CallRecoveryManager: disabling video — bandwidth ${bitrateKbps}kbps < ${this._config.degradationBitrateThreshold}kbps`
      );
    } else if (wasConstrained && bitrateKbps >= this._config.degradationRecoveryThreshold) {
      this._bandwidthConstrained$.next(false);
      this._callbacks.enableVideo();
      this.emitEvent({
        action: 'video_restored',
        reason: `bandwidth ${bitrateKbps}kbps recovered above ${this._config.degradationRecoveryThreshold}kbps`,
        timestamp: Date.now()
      });
      logger.info(
        `CallRecoveryManager: restoring video — bandwidth ${bitrateKbps}kbps >= ${this._config.degradationRecoveryThreshold}kbps`
      );
    }
  }

  /**
   * Feed current network issues for degradation recovery.
   * When video was disabled due to bandwidth constraints, this pipeline
   * monitors packet loss clearance to trigger video restoration.
   */
  public reportNetworkIssues(issues: { type: string }[]): void {
    const hasPacketLoss = issues.some((i) => i.type === 'high_packet_loss');
    if (hasPacketLoss !== this._hasPacketLoss$.value) {
      this._hasPacketLoss$.next(hasPacketLoss);
    }
  }

  /**
   * Signal-only vs full reconnect distinction (Section 25).
   * Call this when WebSocket reconnects to determine the appropriate action.
   */
  public handleWebSocketReconnect(): void {
    const pcState = this._callbacks.getPeerConnectionState();
    const isMediaAlive = pcState === 'connected' || pcState === 'completed';

    if (isMediaAlive) {
      logger.info('CallRecoveryManager: signal-only reconnect — peer connection still alive');
      this.emitEvent({
        action: 'signal_reconnect',
        reason: 'WebSocket reconnected, peer connection still connected',
        timestamp: Date.now()
      });
    } else {
      logger.info('CallRecoveryManager: full reconnect — peer connection also down');
      this.emitEvent({
        action: 'full_reconnect',
        reason: 'WebSocket reconnected, peer connection not connected — ICE restart needed',
        timestamp: Date.now()
      });
      this.pushTrigger({ source: 'network', detail: 'full_reconnect_after_ws' });
    }
    this.reset();
  }

  // --- Lifecycle ---

  public override destroy(): void {
    this._pipelineStop$.next();
    this._pipelineStop$.complete();
    super.destroy();
  }

  // --- Pipeline initialization ---

  private initPipeline(): void {
    this.subscribeTo(
      this._trigger$.pipe(
        tap(() => {
          if (this._recoveryState$.value === 'idle') {
            this.transitionTo('debouncing');
          }
        }),
        debounceTime(this._config.debounceTimeMs),
        withLatestFrom(this._inputs.signalingReady$),
        filter(([, signalingReady]) => this.passGateChecks(signalingReady)),
        map(([trigger]) => trigger),
        exhaustMap((trigger) => this.executeTieredRecovery(trigger)),
        takeUntil(merge(this._destroyed$, this._pipelineStop$))
      ),
      {
        next: () => {
          /* side effects handled inside executeTieredRecovery */
        },
        error: (err) => {
          logger.error('CallRecoveryManager: pipeline error', err);
          this.transitionTo('idle');
        }
      }
    );
  }

  /**
   * When video was disabled due to bandwidth constraints, the browser's
   * bandwidth estimator loses its primary probe signal (video traffic).
   * This means availableOutgoingBitrate may never recover to the restoration
   * threshold. Instead, we watch for packet loss clearance as a proxy for
   * network recovery: if high_packet_loss stays absent for a configurable
   * duration while video is degraded, we restore the video track.
   */
  private initDegradationRecoveryPipeline(): void {
    if (!this._config.enableAutoDegradation) {
      return;
    }

    const delayMs = this._config.packetLossRecoveryDelaySec * 1000;

    this.subscribeTo(
      combineLatest([this._bandwidthConstrained$, this._hasPacketLoss$]).pipe(
        switchMap(([constrained, hasPacketLoss]) => {
          if (constrained && !hasPacketLoss) {
            return timer(delayMs);
          }
          return EMPTY;
        }),
        takeUntil(this._destroyed$)
      ),
      () => {
        this._bandwidthConstrained$.next(false);
        this._callbacks.enableVideo();
        this.emitEvent({
          action: 'video_restored',
          reason: `no packet loss for ${this._config.packetLossRecoveryDelaySec}s — restoring video`,
          timestamp: Date.now()
        });
        logger.info(
          `CallRecoveryManager: restoring video — no packet loss for ${this._config.packetLossRecoveryDelaySec}s`
        );
      }
    );
  }

  // --- Gate checks ---

  private passGateChecks(signalingReady: boolean): boolean {
    if (this._callbacks.isNegotiating()) {
      logger.debug('CallRecoveryManager: gate blocked — negotiation in progress');
      this.transitionTo('idle');
      return false;
    }

    if (!signalingReady) {
      logger.debug('CallRecoveryManager: gate blocked — signaling not ready');
      this.transitionTo('idle');
      return false;
    }

    if (!this._callbacks.isCallConnected()) {
      logger.debug('CallRecoveryManager: gate blocked — call not connected');
      this.transitionTo('idle');
      return false;
    }

    if (this.isCooldownActive()) {
      logger.debug('CallRecoveryManager: gate blocked — cooldown active');
      this.transitionTo('cooldown');
      return false;
    }

    return true;
  }

  private isCooldownActive(): boolean {
    return Date.now() < this._cooldownUntil;
  }

  // --- Tiered recovery ---

  private executeTieredRecovery(trigger: RecoveryTrigger): Observable<void> {
    this.transitionTo('recovering');
    logger.info(
      `CallRecoveryManager: starting tiered recovery — source=${trigger.source} detail=${trigger.detail}`
    );

    return from(this.runTiers(trigger)).pipe(
      tap(() => this.startCooldown()),
      catchError((err) => {
        logger.error('CallRecoveryManager: tiered recovery failed', err);
        this.startCooldown();
        return EMPTY;
      })
    );
  }

  private async runTiers(trigger: RecoveryTrigger): Promise<void> {
    // Tier 1: keyframe request (always executed)
    this.executeKeyframe(trigger.detail);

    // Degradation-only issues (high_rtt, high_jitter, high_packet_loss) stop at Tier 1.
    // The network path is slow/lossy but media is still flowing — ICE restart would
    // cause an unnecessary media interruption on a connection that isn't broken.
    if (trigger.issueType && DEGRADATION_ONLY_ISSUES.has(trigger.issueType)) {
      logger.debug(
        `CallRecoveryManager: degradation-only issue (${trigger.issueType}) — Tier 1 only, skipping ICE restart`
      );
      return;
    }

    // Tier 2: ICE restart (standard) — only for connectivity-breaking issues
    if (this._attemptCount < this._config.maxAttempts) {
      const tier2Success = await this.executeIceRestart(false);
      if (tier2Success) {
        return;
      }
    }

    // Tier 3: Relay-only ICE restart (when enabled)
    if (this._config.enableRelayFallback && this._attemptCount < this._config.maxAttempts) {
      const tier3Success = await this.executeIceRestart(true);
      if (tier3Success) {
        return;
      }
    }

    // All tiers exhausted
    if (this._attemptCount >= this._config.maxAttempts) {
      this.emitEvent({
        action: 'max_attempts_reached',
        reason: `all ${this._config.maxAttempts} recovery attempts exhausted`,
        attempt: this._attemptCount,
        maxAttempts: this._config.maxAttempts,
        timestamp: Date.now()
      });
      logger.warn('CallRecoveryManager: max recovery attempts reached');
    }
  }

  // --- Tier 1: Keyframe ---

  private executeKeyframe(reason: string): void {
    const now = Date.now();

    // Check cooldown
    if (now < this._keyframeCooldownUntil) {
      logger.debug('CallRecoveryManager: keyframe request skipped — cooldown active');
      return;
    }

    // Check burst window
    if (now - this._keyframeBurstStart > this._config.keyframeBurstWindowMs) {
      this._keyframeBurstCount = 0;
      this._keyframeBurstStart = now;
    }

    if (this._keyframeBurstCount >= this._config.keyframeMaxBurst) {
      // Burst limit reached — start cooldown
      this._keyframeCooldownUntil = now + this._config.keyframeCooldownMs;
      logger.debug(
        `CallRecoveryManager: keyframe burst limit reached (${this._config.keyframeMaxBurst}), cooldown until ${this._keyframeCooldownUntil}`
      );
      return;
    }

    this._keyframeBurstCount += 1;
    this._callbacks.requestKeyframe();
    this.emitEvent({
      action: 'keyframe_requested',
      reason,
      timestamp: now
    });
    logger.debug(
      `CallRecoveryManager: keyframe requested (burst ${this._keyframeBurstCount}/${this._config.keyframeMaxBurst})`
    );
  }

  // --- Tier 2 & 3: ICE restart ---

  private async executeIceRestart(relayOnly: boolean): Promise<boolean> {
    this._attemptCount += 1;
    const tier = relayOnly ? 'Tier 3 (relay-only)' : 'Tier 2 (standard)';
    logger.info(
      `CallRecoveryManager: ${tier} ICE restart — attempt ${this._attemptCount}/${this._config.maxAttempts}`
    );

    this.emitEvent({
      action: 'reinvite_started',
      reason: `${tier} ICE restart`,
      attempt: this._attemptCount,
      maxAttempts: this._config.maxAttempts,
      timestamp: Date.now()
    });

    try {
      const success = await this.withTimeout(
        this._callbacks.requestIceRestart(relayOnly),
        this._config.iceRestartTimeoutMs
      );

      if (success) {
        this.emitEvent({
          action: 'reinvite_succeeded',
          reason: `${tier} ICE restart succeeded`,
          attempt: this._attemptCount,
          maxAttempts: this._config.maxAttempts,
          timestamp: Date.now()
        });
        logger.info(`CallRecoveryManager: ${tier} ICE restart succeeded`);
        this._attemptCount = 0;
        return true;
      }

      this.emitEvent({
        action: 'reinvite_failed',
        reason: `${tier} ICE restart returned false`,
        attempt: this._attemptCount,
        maxAttempts: this._config.maxAttempts,
        timestamp: Date.now()
      });
      logger.warn(`CallRecoveryManager: ${tier} ICE restart failed`);
      return false;
    } catch {
      this.emitEvent({
        action: 'reinvite_timeout',
        reason: `${tier} ICE restart timed out after ${this._config.iceRestartTimeoutMs}ms`,
        attempt: this._attemptCount,
        maxAttempts: this._config.maxAttempts,
        timestamp: Date.now()
      });
      logger.warn(`CallRecoveryManager: ${tier} ICE restart timed out`);
      return false;
    }
  }

  // --- Utility ---

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timeoutId);
          resolve(value);
        },
        (err: unknown) => {
          clearTimeout(timeoutId);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      );
    });
  }

  private transitionTo(state: RecoveryState): void {
    const prev = this._recoveryState$.value;
    if (prev !== state) {
      logger.debug(`CallRecoveryManager: state ${prev} -> ${state}`);
      this._recoveryState$.next(state);
    }
  }

  private startCooldown(): void {
    this._cooldownUntil = Date.now() + this._config.cooldownMs;
    this.transitionTo('cooldown');

    // Cancel any existing cooldown timer to prevent accumulation
    if (this._cooldownSubscription) {
      this._cooldownSubscription.unsubscribe();
    }

    // Schedule transition back to idle after cooldown
    this._cooldownSubscription = timer(this._config.cooldownMs)
      .pipe(
        take(1),
        takeUntil(this._destroyed$),
        filter(() => this._recoveryState$.value === 'cooldown')
      )
      .subscribe(() => this.transitionTo('idle'));
  }

  private emitEvent(event: RecoveryEvent): void {
    this._recoveryEvent$.next(event);
  }
}
