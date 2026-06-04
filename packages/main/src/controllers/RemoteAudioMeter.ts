import { animationFrameScheduler, interval, map } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { AUDIO_LEVEL_POLL_INTERVAL_MS } from '../core/constants';
import { getLogger } from '../utils/logger';

import type { Observable } from 'rxjs';

const logger = getLogger();

export interface RemoteAudioMeterOptions {
  /** Factory for AudioContext — override for tests. */
  audioContextFactory?: () => AudioContext;
  /** Polling interval for level$ in ms. Defaults to AUDIO_LEVEL_POLL_INTERVAL_MS. */
  pollIntervalMs?: number;
}

/**
 * Read-only audio level meter for a remote MediaStream. Attaches an
 * AnalyserNode to a MediaStreamAudioSourceNode so it observes the stream
 * without affecting the caller's playback path (no GainNode, no destination).
 *
 * The server delivers all remote audio as a single mixed stream — there is
 * no per-participant demux — so this meter reports the aggregate remote
 * level, not per-member.
 */
export class RemoteAudioMeter extends Destroyable {
  private readonly _audioContext: AudioContext;
  private readonly _analyser: AnalyserNode;
  private readonly _analyserBuffer: Uint8Array<ArrayBuffer>;
  private readonly _pollIntervalMs: number;

  private _source: MediaStreamAudioSourceNode | null = null;
  private _stream: MediaStream | null = null;

  constructor(options: RemoteAudioMeterOptions = {}) {
    super();
    const ctxFactory = options.audioContextFactory ?? ((): AudioContext => new AudioContext());
    this._audioContext = ctxFactory();
    this._analyser = this._audioContext.createAnalyser();
    this._analyser.fftSize = 2048;
    this._analyser.smoothingTimeConstant = 0.3;
    this._analyserBuffer = new Uint8Array(new ArrayBuffer(this._analyser.fftSize));
    this._pollIntervalMs = options.pollIntervalMs ?? AUDIO_LEVEL_POLL_INTERVAL_MS;
  }

  /** RMS level of the remote audio, 0..1. 0 when no stream is attached. */
  public get level$(): Observable<number> {
    return this.deferEmission(
      interval(this._pollIntervalMs, animationFrameScheduler).pipe(map(() => this.computeLevel()))
    );
  }

  /**
   * Attach (or replace) the MediaStream whose audio track is being metered.
   * Pass null to detach without destroying the meter.
   */
  public setStream(stream: MediaStream | null): void {
    if (this._source) {
      try {
        this._source.disconnect();
      } catch (error) {
        logger.debug('[RemoteAudioMeter] source disconnect warning:', error);
      }
      this._source = null;
      this._stream = null;
    }
    if (!stream || stream.getAudioTracks().length === 0) {
      return;
    }
    // Only meter audio tracks — build a dedicated stream to avoid AudioContext
    // refcounting on video tracks.
    this._stream = new MediaStream(stream.getAudioTracks());
    this._source = this._audioContext.createMediaStreamSource(this._stream);
    // Intentionally do NOT connect to destination — we're observing only.
  }

  public override destroy(): void {
    if (this._source) {
      try {
        this._source.disconnect();
      } catch {
        // already disconnected
      }
      this._source = null;
    }
    void this._audioContext.close().catch((error: unknown) => {
      logger.debug('[RemoteAudioMeter] audio context close warning:', error);
    });
    super.destroy();
  }

  private computeLevel(): number {
    if (!this._source) {
      return 0;
    }
    this._analyser.getByteTimeDomainData(this._analyserBuffer);
    let sum = 0;
    for (const sample of this._analyserBuffer) {
      const normalized = (sample - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / this._analyserBuffer.length);
  }
}
