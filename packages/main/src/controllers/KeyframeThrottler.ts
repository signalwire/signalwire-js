/**
 * Default maximum number of keyframe requests allowed within the burst window.
 */
const DEFAULT_MAX_BURST = 3;

/**
 * Default burst window duration in milliseconds.
 */
const DEFAULT_BURST_WINDOW_MS = 3000;

/**
 * Default cooldown duration in milliseconds after burst limit is reached.
 */
const DEFAULT_COOLDOWN_MS = 10000;

/**
 * Options for constructing a KeyframeThrottler.
 */
export interface KeyframeThrottlerOptions {
  /** Maximum number of requests allowed within the burst window. Defaults to 3. */
  readonly maxBurst?: number;
  /** Duration of the burst window in milliseconds. Defaults to 3000. */
  readonly burstWindowMs?: number;
  /** Cooldown duration in milliseconds after burst limit is hit. Defaults to 10000. */
  readonly cooldownMs?: number;
}

/**
 * KeyframeThrottler implements burst-based throttling for video keyframe requests.
 *
 * Allows up to `maxBurst` requests within a rolling `burstWindowMs` window.
 * Once the burst limit is hit, all requests are blocked until `cooldownMs`
 * has elapsed since the last request that triggered the cooldown.
 *
 * This is a pure logic class -- it does not extend Destroyable since it holds
 * no subscriptions or subjects.
 */
export class KeyframeThrottler {
  private readonly _maxBurst: number;
  private readonly _burstWindowMs: number;
  private readonly _cooldownMs: number;
  private _timestamps: number[] = [];
  private _cooldownUntil: number = 0;

  constructor(options: KeyframeThrottlerOptions = {}) {
    this._maxBurst = options.maxBurst ?? DEFAULT_MAX_BURST;
    this._burstWindowMs = options.burstWindowMs ?? DEFAULT_BURST_WINDOW_MS;
    this._cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  /**
   * Check whether a keyframe request is currently allowed.
   *
   * @returns true if the request is permitted, false if throttled.
   */
  public canRequest(): boolean {
    const now = Date.now();

    if (now < this._cooldownUntil) {
      return false;
    }

    const windowStart = now - this._burstWindowMs;
    const recentRequests = this._timestamps.filter((t) => t > windowStart);

    return recentRequests.length < this._maxBurst;
  }

  /**
   * Record that a keyframe request was made. If this request hits the burst
   * limit, a cooldown period is activated.
   */
  public record(): void {
    const now = Date.now();

    this._timestamps = [...this._timestamps, now];

    // Prune timestamps older than the burst window
    const windowStart = now - this._burstWindowMs;
    this._timestamps = this._timestamps.filter((t) => t > windowStart);

    // If we've hit the burst limit, activate cooldown
    if (this._timestamps.length >= this._maxBurst) {
      this._cooldownUntil = now + this._cooldownMs;
    }
  }

  /**
   * Reset all throttling state, clearing timestamps and cooldown.
   */
  public reset(): void {
    this._timestamps = [];
    this._cooldownUntil = 0;
  }
}
