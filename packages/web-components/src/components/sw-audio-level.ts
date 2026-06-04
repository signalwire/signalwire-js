/**
 * Audio Level Component
 *
 * Visual audio level indicator that renders real-time audio levels from a MediaStream
 * via Web Audio API. Displays configurable number of bars with color transitions
 * based on audio intensity.
 *
 * Input precedence (most specific wins): `.stream` > `.call` (uses `localStream`)
 * > context (uses `localStream`).
 *
 * @example
 * ```html
 * <sw-audio-level .stream=${mediaStream} bars="5" orientation="vertical"></sw-audio-level>
 * <sw-audio-level .call=${call}></sw-audio-level>
 * <sw-audio-level></sw-audio-level> <!-- inside provider -->
 * ```
 *
 * @cssprop [--interactive-status-success=#22c55e] - Color for low audio levels.
 * @cssprop [--interactive-status-warning=#ffd700] - Color for medium audio levels.
 * @cssprop [--interactive-button-destructive-bg=#dc2626] - Color for high audio levels.
 * @cssprop [--sw-audio-bar-width=4px] - Width of each audio level bar.
 * @cssprop [--sw-audio-bar-gap=2px] - Gap between audio level bars.
 * @cssprop [--sw-audio-bar-radius=2px] - Border radius of each bar.
 * @cssprop [--sw-audio-bar-background=#404040] - Background color of inactive bars.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import { getLogger } from '@signalwire/js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { Call } from '../types/index.js';

const logger = getLogger();

@customElement('sw-audio-level')
export class SwAudioLevel extends LitElement {
  static styles = css`
    :host {
      --sw-audio-bar-width: 4px;
      --sw-audio-bar-gap: 2px;
      --sw-audio-bar-radius: 2px;
      --sw-audio-bar-background: rgba(255, 255, 255, 0.2);

      display: inline-flex;
    }

    .container {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: var(--sw-audio-bar-gap);
    }

    :host([orientation='horizontal']) .container {
      flex-direction: row;
      align-items: center;
    }

    :host([orientation='vertical']) .container,
    .container {
      flex-direction: row;
      align-items: flex-end;
    }

    .bar {
      width: var(--sw-audio-bar-width);
      background: var(--sw-audio-bar-background);
      border-radius: var(--sw-audio-bar-radius);
      transition:
        height 0.05s ease-out,
        width 0.05s ease-out,
        background-color 0.1s ease;
      min-height: 4px;
    }

    :host([orientation='horizontal']) .bar {
      height: var(--sw-audio-bar-width);
      width: 4px;
      min-width: 4px;
      min-height: auto;
    }

    .bar.active {
      /* Color is set dynamically via inline style */
    }

    .bar.level-low {
      background-color: var(--interactive-status-success);
    }

    .bar.level-medium {
      background-color: var(--interactive-status-warning);
    }

    .bar.level-high {
      background-color: var(--interactive-button-destructive-bg);
    }
  `;

  /**
   * Explicit MediaStream to analyze — highest precedence.
   */
  @property({ type: Object }) stream?: MediaStream;

  /**
   * Explicit Call — when set, analyzes the call's `localStream`.
   * Bypassed by `.stream` if both are set.
   */
  @property({ type: Object }) call?: Call;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  @state() private _directLocalStream: MediaStream | null = null;

  private _directSubscriptions: Subscription[] = [];

  private get _effectiveStream(): MediaStream | undefined {
    if (this.stream) return this.stream;
    if (this.call) return this._directLocalStream ?? undefined;
    return this._callState?.localStream ?? undefined;
  }

  /**
   * Number of bars to display (default: 5)
   */
  @property({ type: Number }) bars = 5;

  /**
   * Orientation of the bars: 'vertical' or 'horizontal'
   */
  @property({ type: String, reflect: true }) orientation: 'vertical' | 'horizontal' = 'vertical';

  /**
   * When true, automatically calls getUserMedia({ audio: true }) to acquire
   * a microphone stream instead of requiring the consumer to set `.stream`.
   */
  @property({ type: Boolean, reflect: true, attribute: 'auto-request' }) autoRequest = false;

  /**
   * Maximum height/width of bars in pixels
   */
  @property({ type: Number }) maxSize = 32;

  /**
   * Current audio levels for each bar (0-1)
   */
  @state() private _levels: number[] = [];

  /**
   * Web Audio API context
   */
  private _audioContext?: AudioContext;

  /**
   * Analyser node for frequency data
   */
  private _analyser?: AnalyserNode;

  /**
   * Source node connected to the MediaStream
   */
  private _source?: MediaStreamAudioSourceNode;

  /**
   * Animation frame ID for cleanup
   */
  private _animationFrameId?: number;

  /**
   * Frequency data buffer
   */
  private _dataArray?: Uint8Array<ArrayBuffer>;

  /**
   * Whether we own the stream and must stop its tracks on cleanup.
   */
  private _ownsStream = false;

  /** Guard against concurrent getUserMedia calls (connectedCallback + first updated both fire). */
  private _micRequested = false;

  /**
   * Lifecycle: Component connected to DOM
   */
  connectedCallback() {
    super.connectedCallback();
    this._levels = new Array(this.bars).fill(0);
    const eff = this._effectiveStream;
    if (this.autoRequest && !eff) {
      this._requestMicStream();
    } else if (eff) {
      this._activeStream = eff;
      this.setupAudioAnalysis();
    }
  }

  /** Stream currently wired to the analyser — used to detect real changes. */
  private _activeStream?: MediaStream;

  /**
   * Lifecycle: React to property changes
   */
  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has('call')) {
      this._directSubscriptions.forEach((s) => s.unsubscribe());
      this._directSubscriptions = [];
      this._directLocalStream = null;
      if (this.call) {
        this._directSubscriptions.push(
          this.call.localStream$.subscribe((s) => (this._directLocalStream = s))
        );
      }
    }

    if (changedProperties.has('autoRequest') && this.autoRequest && !this._effectiveStream) {
      this._requestMicStream();
    }

    const reactsToInput =
      changedProperties.has('stream') ||
      changedProperties.has('call') ||
      changedProperties.has('_directLocalStream') ||
      changedProperties.has('_callState');

    if (reactsToInput) {
      const next = this._effectiveStream;
      if (next !== this._activeStream) {
        this.cleanupAudioAnalysis();
        this._activeStream = next;
        if (next) this.setupAudioAnalysis();
      }
    }

    if (changedProperties.has('bars')) {
      this._levels = new Array(this.bars).fill(0);
    }
  }

  /**
   * Lifecycle: Component disconnected from DOM
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanupAudioAnalysis();
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
  }

  /**
   * Public method to release all audio resources immediately
   * Call this before stopping the MediaStream tracks to ensure proper cleanup
   */
  public releaseResources(): void {
    this.cleanupAudioAnalysis();
    this.stream = undefined;
  }

  /**
   * Request a microphone stream via getUserMedia for auto-request mode.
   */
  private _requestMicStream(): void {
    if (this._micRequested) return;
    this._micRequested = true;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        // Component may have been removed while getUserMedia was pending.
        // Stop the tracks immediately rather than leaking the mic capture.
        if (!this.isConnected) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        this._ownsStream = true;
        this.stream = mediaStream;
      })
      .catch((err) => {
        this._micRequested = false;
        logger.error('[SwAudioLevel] Failed to acquire microphone:', err);
      });
  }

  /**
   * Setup Web Audio API for audio level analysis
   */
  private setupAudioAnalysis(): void {
    const stream = this._activeStream ?? this._effectiveStream;
    if (!stream) return;

    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      logger.warn('[SwAudioLevel] MediaStream has no audio tracks');
      return;
    }

    try {
      // Create AudioContext
      this._audioContext = new AudioContext();

      // Resume in case the browser started the context suspended (autoplay policy)
      if (this._audioContext.state === 'suspended') {
        void this._audioContext.resume();
      }

      // Create analyser node
      this._analyser = this._audioContext.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = 0.8;

      // Create source from MediaStream
      this._source = this._audioContext.createMediaStreamSource(stream);
      this._source.connect(this._analyser);

      // Create data array for frequency data
      const bufferLength = this._analyser.frequencyBinCount;
      this._dataArray = new Uint8Array(bufferLength);

      // Start animation loop
      this.startAnimationLoop();
    } catch (error) {
      logger.error('[SwAudioLevel] Failed to setup audio analysis:', error);
    }
  }

  /**
   * Cleanup Web Audio API resources
   */
  private cleanupAudioAnalysis(): void {
    // Cancel animation frame
    if (this._animationFrameId !== undefined) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = undefined;
    }

    // Disconnect source
    if (this._source) {
      this._source.disconnect();
      this._source = undefined;
    }

    // Disconnect analyser (not strictly necessary but good practice)
    if (this._analyser) {
      this._analyser.disconnect();
      this._analyser = undefined;
    }

    // Close AudioContext
    if (this._audioContext && this._audioContext.state !== 'closed') {
      this._audioContext.close().catch((err) => logger.error('[SwAudioLevel] Close failed:', err));
      this._audioContext = undefined;
    }

    // Stop tracks if we acquired the stream via auto-request
    if (this._ownsStream && this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this._ownsStream = false;
    }

    this._activeStream = undefined;

    this._micRequested = false;

    // Clear data array
    this._dataArray = undefined;

    // Reset levels
    this._levels = new Array(this.bars).fill(0);
  }

  /**
   * Start the animation loop for updating levels
   */
  private startAnimationLoop(): void {
    const updateLevels = () => {
      const analyser = this._analyser;
      const dataArray = this._dataArray;
      if (!analyser || !dataArray) {
        return;
      }

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Calculate levels for each bar by sampling frequency ranges
      const levels: number[] = [];
      const binCount = dataArray.length;
      const binsPerBar = Math.floor(binCount / this.bars);

      for (let i = 0; i < this.bars; i++) {
        const startBin = i * binsPerBar;
        const endBin = Math.min(startBin + binsPerBar, binCount);

        // Average the frequency values for this bar's range
        let sum = 0;
        for (let j = startBin; j < endBin; j++) {
          sum += dataArray[j] ?? 0;
        }
        const average = sum / (endBin - startBin);

        // Normalize to 0-1 range
        levels.push(average / 255);
      }

      this._levels = levels;
      this.requestUpdate();

      // Schedule next frame
      this._animationFrameId = requestAnimationFrame(updateLevels);
    };

    this._animationFrameId = requestAnimationFrame(updateLevels);
  }

  /**
   * Get the color class based on level
   */
  private getLevelClass(level: number): string {
    if (level > 0.7) return 'level-high';
    if (level > 0.4) return 'level-medium';
    if (level > 0.05) return 'level-low';
    return '';
  }

  /**
   * Get the active class if level is above threshold
   */
  private isActive(level: number): boolean {
    return level > 0.05;
  }

  /**
   * Render the component
   */
  render() {
    // Ensure we have the right number of levels
    const levels = this._levels.length === this.bars ? this._levels : new Array(this.bars).fill(0);

    // Aggregate level (peak across bars), normalized 0–100 for aria-valuenow.
    const peak = levels.reduce((a: number, b: number) => Math.max(a, b), 0);
    const ariaValue = Math.round(peak * 100);

    return html`
      <div
        class="container"
        part="container"
        role="meter"
        aria-label="Audio input level"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${ariaValue}
      >
        ${levels.map((level, index) => {
          const isActive = this.isActive(level);
          const levelClass = this.getLevelClass(level);
          const size = Math.max(4, level * this.maxSize);

          const style =
            this.orientation === 'horizontal' ? `width: ${size}px;` : `height: ${size}px;`;

          return html`
            <div
              class="bar ${isActive ? 'active' : ''} ${levelClass}"
              part="bar ${isActive ? 'bar-active' : ''}"
              style="${style}"
              data-bar-index="${index}"
              aria-hidden="true"
            ></div>
          `;
        })}
      </div>
    `;
  }
}

/**
 * Declare global type for TypeScript
 */
declare global {
  interface HTMLElementTagNameMap {
    'sw-audio-level': SwAudioLevel;
  }
}
