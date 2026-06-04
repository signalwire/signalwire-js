/**
 * Call Media Component
 *
 * Renders the remote video stream with aspect-ratio-aware sizing.
 *
 * Input precedence (most specific wins): `.stream` > `.call` > context.
 *
 * @example
 * ```html
 * <!-- Inside a context provider (sw-call-widget): -->
 * <sw-call-media></sw-call-media>
 *
 * <!-- With an explicit Call: -->
 * <sw-call-media .call=${call}></sw-call-media>
 *
 * <!-- With a raw remote stream: -->
 * <sw-call-media .stream=${remoteStream}></sw-call-media>
 * ```
 *
 * @csspart container - Outer container that holds the video and overlay layers.
 * @csspart video     - The `<video>` element rendering the remote stream.
 *
 * @slot - Default slot for overlay layers (e.g. `<sw-self-media>`, `<sw-participants>`).
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import type { Call } from '../types/index.js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { devicesContext, type DevicesState } from '../context/devices-context.js';
import { attachMediaStream, detachMediaStream } from '../utils/video.js';
import { getLogger } from '@signalwire/js';

const logger = getLogger();

@customElement('sw-call-media')
export class SwCallMedia extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .mcu-content {
      position: relative;
      width: 100%;
      height: 100%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-page, #0e0e18);
      overflow: hidden;
    }

    /* Fill the parent box. The video element below uses object-fit: contain
       so the stream letterboxes into whatever rectangle the parent gives us
       — no JS sizing pass required. */
    .padding-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* Outer rounding is owned by sw-ui-call-layout's :host border-radius +
       overflow:hidden. Rounding here too carves a notch out of the right
       edge of the video cell that exposes whatever sits behind the widget
       (page / modal backdrop) as a black sliver in light mode. */
    .mcu-wrapper {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .mcu-video {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
    }

    .mcu-layers {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
  `;

  /**
   * Explicit Call — when set, subscribes directly to its observables instead
   * of relying on context. Overridden by `.stream` if both are set.
   */
  @property({ type: Object }) call?: Call;

  /**
   * Explicit remote MediaStream — highest precedence. Bypasses both `.call`
   * and context. Useful for raw rendering with no SDK at all.
   */
  @property({ attribute: false }) stream: MediaStream | null = null;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devicesState?: DevicesState;

  private _remoteStreamValue: MediaStream | null = null;
  private _lastTrackSignature = '';
  private _subscriptions: Subscription[] = [];

  // ── Lifecycle ──────────────────────────────────────────────────────

  connectedCallback() {
    super.connectedCallback();
    if (!this.stream && this.call) this._setupDirectSubscriptions();
    if (this.stream) {
      this._remoteStreamValue = this.stream;
      this._lastTrackSignature = this._computeTrackSignature(this.stream);
    }
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    // Direct call prop changed — re-subscribe (only meaningful when `.stream` isn't set)
    if (changedProperties.has('call')) {
      this._cleanupDirectSubscriptions();
      if (!this.stream && this.call) this._setupDirectSubscriptions();
    }

    // Explicit `.stream` prop wins — attach it and skip everything else.
    if (changedProperties.has('stream')) {
      this._cleanupDirectSubscriptions();
      const stream = this.stream;
      const signature = this._computeTrackSignature(stream);
      if (stream !== this._remoteStreamValue || signature !== this._lastTrackSignature) {
        this._remoteStreamValue = stream;
        this._lastTrackSignature = signature;
        const video = this.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement;
        if (video) attachMediaStream(video, stream);
      }
    }

    // Context-driven: stream or its track set changed.
    // WebRTC delivers tracks one at a time via ontrack, and the SDK re-emits
    // the same MediaStream reference each time — so we must also re-attach when
    // the track set changes, otherwise Chromium may never render a video track
    // added after the initial srcObject assignment.
    if (!this.stream && !this.call && changedProperties.has('_callState')) {
      const stream = this._callState?.remoteStream ?? null;
      const signature = this._computeTrackSignature(stream);
      if (stream !== this._remoteStreamValue || signature !== this._lastTrackSignature) {
        this._remoteStreamValue = stream;
        this._lastTrackSignature = signature;
        const video = this.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement;
        if (video) attachMediaStream(video, stream);
      }
    }

    // Audio output device changed
    if (changedProperties.has('_devicesState')) {
      this._applySinkId(this._devicesState?.selectedAudioOutput?.deviceId ?? '');
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupDirectSubscriptions();
    this._cleanupVideoElement();
  }

  // ── Direct call subscriptions (legacy / standalone) ────────────────

  private _setupDirectSubscriptions(): void {
    if (!this.call) return;
    this._subscriptions.push(
      this.call.remoteStream$.subscribe((stream: MediaStream | null) => {
        const signature = this._computeTrackSignature(stream);
        if (stream === this._remoteStreamValue && signature === this._lastTrackSignature) {
          return;
        }
        this._remoteStreamValue = stream;
        this._lastTrackSignature = signature;
        this.requestUpdate();
        const video = this.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement;
        if (video) attachMediaStream(video, stream);
      })
    );
  }

  private _computeTrackSignature(stream: MediaStream | null): string {
    if (!stream) return '';
    return stream.getTracks().map((t) => `${t.kind}:${t.id}`).sort().join('|');
  }

  private _cleanupDirectSubscriptions(): void {
    this._subscriptions.forEach((sub) => sub.unsubscribe());
    this._subscriptions = [];
  }

  // ── Audio output ───────────────────────────────────────────────────

  private _applySinkId(deviceId: string): void {
    const video = this.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };
    if (!video?.setSinkId) return;
    video.setSinkId(deviceId).catch((err) => {
      logger.error('[SwCallMedia] Failed to set audio output device:', err);
    });
  }

  // ── Cleanup ─────────────────────────────────────────────────────────

  private _cleanupVideoElement(): void {
    const video = this.shadowRoot?.querySelector('video.mcu-video') as HTMLVideoElement;
    if (video) detachMediaStream(video);
  }

  // ── Render ─────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="mcu-content" part="container">
        <div class="padding-wrapper">
          <div class="mcu-wrapper">
            <video
              class="mcu-video"
              part="video"
              autoplay
              playsinline
              muted
              .srcObject=${this._remoteStreamValue}
            ></video>
          </div>
          <div class="mcu-layers">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-media': SwCallMedia;
  }
}
