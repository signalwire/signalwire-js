import { animationFrameScheduler, distinctUntilChanged, interval, map } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { AUDIO_LEVEL_POLL_INTERVAL_MS, VAD_HOLD_MS, VAD_THRESHOLD } from '../core/constants';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

/**
 * Options for {@link LocalAudioPipeline}.
 */
export interface LocalAudioPipelineOptions {
  /** Factory for AudioContext — override for tests. Defaults to `new AudioContext()`. */
  audioContextFactory?: () => AudioContext;
  /** Initial gain (0..2, where 1 is unity). Defaults to 1. */
  initialGain?: number;
  /** RMS level [0..1] above which speaking$ emits true. Defaults to {@link VAD_THRESHOLD}. */
  speakingThreshold?: number;
  /**
   * Milliseconds of silence below the threshold before speaking$ flips back to
   * false. Prevents flicker on normal speech gaps. Defaults to {@link VAD_HOLD_MS}.
   */
  speakingHoldMs?: number;
  /** Polling interval for level$. Defaults to {@link AUDIO_LEVEL_POLL_INTERVAL_MS}. */
  pollIntervalMs?: number;
}

/**
 * Web Audio pipeline for the local microphone stream.
 *
 * Wraps the raw mic `MediaStreamTrack` in a graph of:
 *
 * ```
 *   MediaStreamAudioSourceNode  →  GainNode  →  AnalyserNode  →  MediaStreamAudioDestinationNode
 * ```
 *
 * The {@link outputTrack} from the destination node is what callers should
 * attach to the `RTCRtpSender` in place of the raw mic track. The same
 * destination track is reused across input changes (device switch, mute /
 * unmute track replacement) so the sender reference stays stable — only the
 * source end of the graph is rebuilt.
 *
 * The pipeline owns a single {@link AudioContext}. Callers must invoke
 * {@link destroy} to release it when the call ends.
 */
export class LocalAudioPipeline extends Destroyable {
  private readonly _audioContext: AudioContext;
  private readonly _gainNode: GainNode;
  private readonly _analyser: AnalyserNode;
  private readonly _destination: MediaStreamAudioDestinationNode;
  private readonly _analyserBuffer: Uint8Array<ArrayBuffer>;
  private readonly _speakingThreshold: number;
  private readonly _speakingHoldMs: number;
  private readonly _pollIntervalMs: number;

  private _inputSource: MediaStreamAudioSourceNode | null = null;
  private _inputStream: MediaStream | null = null;
  private _lastSpokeAt = 0;

  private _gain$ = this.createBehaviorSubject<number>(1);
  /** 1 when audio should pass through, 0 when silenced by PTT. */
  private _pttMultiplier = 1;

  constructor(options: LocalAudioPipelineOptions = {}) {
    super();
    const ctxFactory = options.audioContextFactory ?? ((): AudioContext => new AudioContext());
    this._audioContext = ctxFactory();
    this._gainNode = this._audioContext.createGain();
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.smoothingTimeConstant = 0.3;
    this._analyserBuffer = new Uint8Array(new ArrayBuffer(this._analyser.fftSize));
    this._destination = this._audioContext.createMediaStreamDestination();

    this._gainNode.connect(this._analyser);
    this._analyser.connect(this._destination);

    this._speakingThreshold = options.speakingThreshold ?? VAD_THRESHOLD;
    this._speakingHoldMs = options.speakingHoldMs ?? VAD_HOLD_MS;
    this._pollIntervalMs = options.pollIntervalMs ?? AUDIO_LEVEL_POLL_INTERVAL_MS;

    const initial = options.initialGain ?? 1;
    this._gain$.next(initial);
    this.applyEffectiveGain();
  }

  /** Observable of the current gain value (0..2). */
  public get gain$(): Observable<number> {
    return this._gain$.asObservable();
  }

  /** Current gain value (0..2). */
  public get gain(): number {
    return this._gain$.value;
  }

  /**
   * Processed output track to attach to the RTCRtpSender. Stable reference
   * across input changes, so `sender.replaceTrack(pipeline.outputTrack)` only
   * needs to be called once.
   */
  public get outputTrack(): MediaStreamTrack {
    const [track] = this._destination.stream.getAudioTracks();
    return track;
  }

  /**
   * Root-mean-square audio level of the input signal, 0..1. Emits on a fixed
   * interval (~30fps by default).
   */
  public get level$(): Observable<number> {
    return this.deferEmission(
      interval(this._pollIntervalMs, animationFrameScheduler).pipe(map(() => this.computeLevel()))
    );
  }

  /**
   * Boolean VAD derived from {@link level$}. True while level ≥ threshold or
   * during the hold window after the last frame that crossed the threshold.
   */
  public get speaking$(): Observable<boolean> {
    return this.deferEmission(
      this.level$.pipe(
        map((level) => this.evaluateSpeaking(level)),
        distinctUntilChanged()
      )
    );
  }

  /**
   * Set gain multiplier applied to the input signal. 0 = silence,
   * 1 = unity, 2 = 2x. Values are clamped to [0, 2]. The effective gain on
   * the graph also respects the current PTT state.
   */
  public setGain(value: number): void {
    const clamped = Math.max(0, Math.min(2, value));
    this._gain$.next(clamped);
    this.applyEffectiveGain();
  }

  /**
   * Silence the graph when `active = false`, otherwise restore the configured
   * gain. Use this from a PTT handler: released → `false`, held → `true`.
   * Orthogonal to {@link setGain} — once PTT returns to active, the last
   * configured gain reappears.
   */
  public setPTTActive(active: boolean): void {
    this._pttMultiplier = active ? 1 : 0;
    this.applyEffectiveGain();
  }

  private applyEffectiveGain(): void {
    this._gainNode.gain.value = this._gain$.value * this._pttMultiplier;
  }

  /**
   * Wire a new raw mic track as the pipeline's input. Replaces any previous
   * input source and reconnects the graph so {@link outputTrack} continues
   * to emit the processed audio. Pass `null` to disconnect the input (the
   * output track stays alive but emits silence).
   *
   * Also resumes the underlying AudioContext on attach — Chrome creates it
   * in a suspended state and the graph won't process (the destination
   * track emits silence) until resume() succeeds.
   */
  public setInputTrack(track: MediaStreamTrack | null): void {
    if (this._inputSource) {
      try {
        this._inputSource.disconnect();
      } catch (error) {
        logger.debug('[LocalAudioPipeline] input disconnect warning:', error);
      }
      this._inputSource = null;
    }
    if (this._inputStream) {
      this._inputStream = null;
    }
    if (!track) {
      return;
    }
    this._inputStream = new MediaStream([track]);
    this._inputSource = this._audioContext.createMediaStreamSource(this._inputStream);
    this._inputSource.connect(this._gainNode);
    if (this._audioContext.state === 'suspended') {
      void this._audioContext.resume().catch((error: unknown) => {
        logger.warn('[LocalAudioPipeline] AudioContext resume failed:', error);
      });
    }
  }

  public override destroy(): void {
    if (this._inputSource) {
      try {
        this._inputSource.disconnect();
      } catch {
        // already disconnected
      }
      this._inputSource = null;
    }
    try {
      this._gainNode.disconnect();
      this._analyser.disconnect();
    } catch {
      // already disconnected
    }
    void this._audioContext.close().catch((error: unknown) => {
      logger.debug('[LocalAudioPipeline] audio context close warning:', error);
    });
    super.destroy();
  }

  private computeLevel(): number {
    if (!this._inputSource) {
      return 0;
    }
    this._analyser.getByteTimeDomainData(this._analyserBuffer);
    let sum = 0;
    for (const sample of this._analyserBuffer) {
      // Samples are unsigned 8-bit, centered at 128. Convert to [-1, 1].
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / this._analyserBuffer.length);
  }

  private evaluateSpeaking(level: number): boolean {
    const now = Date.now();
    if (level >= this._speakingThreshold) {
      this._lastSpokeAt = now;
      return true;
    }
    return now - this._lastSpokeAt < this._speakingHoldMs;
  }
}
