/**
 * Self Media Component
 *
 * Renders local video overlay with positioning from layoutLayers.
 *
 * Input precedence (most specific wins): `.call` > context.
 * `.stream` is not applicable — this component requires `layoutLayers` and
 * `self.id`, which only come from a Call.
 *
 * @example
 * ```html
 * <!-- Inside a context provider: -->
 * <sw-self-media mirror></sw-self-media>
 *
 * <!-- Standalone with an explicit Call: -->
 * <sw-self-media .call=${call} mirror></sw-self-media>
 * ```
 *
 * @csspart container - Positioned overlay container matching the layout layer rect.
 * @csspart video     - The `<video>` element rendering the local stream.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { Call, LayoutLayer } from '../types/index.js';
import type { CallSelfParticipant } from '@signalwire/js';

@customElement('sw-self-media')
export class SwSelfMedia extends LitElement {
  static styles = css`
    :host {
      display: contents;
    }

    .local-overlay {
      box-sizing: border-box;
    }

    video {
      display: block;
    }
  `;

  @property({ type: Boolean, reflect: true }) mirror = false;

  /** Explicit Call — when set, subscribes directly and bypasses context. */
  @property({ type: Object }) call?: Call;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  @state() private _directLocalStream: MediaStream | null = null;
  @state() private _directLayoutLayers: LayoutLayer[] = [];
  @state() private _directSelf: CallSelfParticipant | null = null;

  private _directSubscriptions: Subscription[] = [];

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('call')) {
      this._teardownDirect();
      if (this.call) this._setupDirect(this.call);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownDirect();
  }

  private _setupDirect(call: Call): void {
    this._directSubscriptions.push(
      call.localStream$.subscribe((s) => (this._directLocalStream = s)),
      call.layoutLayers$.subscribe((l) => (this._directLayoutLayers = l)),
      call.self$.subscribe((s) => (this._directSelf = s))
    );
  }

  private _teardownDirect(): void {
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
    this._directLocalStream = null;
    this._directLayoutLayers = [];
    this._directSelf = null;
  }

  private _getSelfLayer(): LayoutLayer | undefined {
    const selfId = this.call ? this._directSelf?.id : this._callState?.self?.id;
    if (!selfId) return undefined;
    const layers = this.call ? this._directLayoutLayers : this._callState?.layoutLayers ?? [];
    return layers.find((layer) => layer.member_id === selfId);
  }

  render() {
    const layer = this._getSelfLayer();
    if (!layer) return null;

    const localStream = this.call
      ? this._directLocalStream
      : this._callState?.localStream ?? null;
    const hasVideoTracks = (localStream?.getVideoTracks().length ?? 0) > 0;
    if (!hasVideoTracks) return null;

    const style = `
      position: absolute;
      top: ${layer.y}%;
      left: ${layer.x}%;
      width: ${layer.width}%;
      height: ${layer.height}%;
      opacity: ${layer.visible ? 1 : 0};
      overflow: hidden;
      transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
      pointer-events: none;
    `;

    const videoStyle = this.mirror
      ? 'transform: scale(-1, 1); -webkit-transform: scale(-1, 1);'
      : '';

    return html`
      <div class="local-overlay" part="container" style="${style}">
        <video
          class="local-video"
          part="video"
          style="width: 100%; height: 100%; object-fit: cover; ${videoStyle}"
          autoplay
          playsinline
          muted
          disablePictureInPicture
          .srcObject=${localStream}
        ></video>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-self-media': SwSelfMedia;
  }
}
