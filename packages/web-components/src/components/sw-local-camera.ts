import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import { attachMediaStream, detachMediaStream } from '../utils/video.js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { devicesContext, type DevicesState } from '../context/devices-context.js';
import type { Call } from '../types/index.js';
import './UI/icons/sw-ui-icon.js';

/**
 * Local camera preview. Adapts its aspect-ratio to match the actual
 * video track (landscape or portrait).
 *
 * Input precedence : `.stream`/`.videoMuted` > `.call` > context.
 *
 * @prop {MediaStream|null} stream     - explicit stream (overrides .call and context)
 * @prop {boolean}          videoMuted - explicit muted flag (overrides context)
 * @prop {Call}             call       - explicit Call object (overrides context)
 * @prop {boolean}          mirror     - mirror the video horizontally
 *
 * @csspart video       - The `<video>` element.
 * @csspart placeholder - Camera-off overlay shown while muted.
 *
 * @cssprop [--sw-local-camera-aspect=16/9] - Aspect ratio; auto-set from track settings when available.
 */
@customElement('sw-local-camera')
export class SwLocalCamera extends LitElement {
  /** Explicit stream — highest precedence. */
  @property({ attribute: false }) stream: MediaStream | null = null;

  /** Explicit muted flag — overrides devicesContext.videoMuted. */
  @property({ type: Boolean, reflect: true, attribute: 'video-muted' }) videoMuted?: boolean;

  /** Explicit Call — used when `.stream` is not set. Bypasses context. */
  @property({ type: Object }) call?: Call;

  @property({ type: Boolean, reflect: true }) mirror = false;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devicesState?: DevicesState;

  @state() private _directLocalStream: MediaStream | null = null;

  private _directSubscriptions: Subscription[] = [];

  /** Detected aspect ratio from the video track, e.g. "16 / 9" or "9 / 16". */
  @state() private _aspectRatio = '16 / 9';

  /** Last stream reference attached to the video element — used to skip no-op re-attaches. */
  private _attachedStream: MediaStream | null = null;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      aspect-ratio: var(--sw-local-camera-aspect, 16 / 9);
      position: relative;
      background: #000;
      border-radius: inherit;
    }

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-radius: inherit;
    }

    :host([mirror]) video {
      transform: scaleX(-1);
    }

    .muted-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-page);
      border-radius: inherit;
    }

    .muted-overlay sw-ui-icon {
      color: var(--bg-surface-raised);
    }
  `;

  private get _effectiveStream(): MediaStream | null {
    if (this.stream) return this.stream;
    if (this.call) return this._directLocalStream;
    return this._callState?.localStream ?? null;
  }

  private get _effectiveMuted(): boolean {
    return this.videoMuted ?? this._devicesState?.videoMuted ?? false;
  }

  protected firstUpdated(): void {
    // Mirror the anti-pause handler from createVideoElement so Safari/Firefox
    // camera-switch pauses don't leave the preview stuck.
    const video = this.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
    if (video) {
      video.addEventListener('pause', () => {
        if (!this._effectiveMuted) {
          video.play().catch(() => {});
        }
      });
    }
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);

    if (changedProperties.has('call')) {
      this._teardownDirect();
      if (this.call) this._setupDirect(this.call);
    }

    const effectiveStream = this._effectiveStream;

    // Only re-attach when the stream reference genuinely changes.
    // The SDK mutates the same MediaStream object (adds/removes tracks) so
    // setting srcObject to the same reference is a browser no-op and can
    // cause a black frame flash on every unrelated context update.
    const streamRefChanged =
      changedProperties.has('stream') ||
      changedProperties.has('call') ||
      changedProperties.has('_directLocalStream') ||
      (changedProperties.has('_callState') && effectiveStream !== this._attachedStream);

    if (streamRefChanged) {
      const video = this.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        this._attachedStream = effectiveStream;
        attachMediaStream(video, effectiveStream);
        this._detectAspectRatio();
      }
    }

    // Ensure playback resumes after unmute or after a new stream is attached.
    // Do NOT guard with video.paused — after mute/unmute the element can be in
    // a "stalled" or "waiting" state where paused===false but nothing plays.
    if (
      changedProperties.has('videoMuted') ||
      changedProperties.has('_devicesState') ||
      streamRefChanged
    ) {
      if (!this._effectiveMuted) {
        const video = this.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
        if (video) {
          video.play().catch(() => {});
        }
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    const video = this.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
    if (video) detachMediaStream(video);
    this._teardownDirect();
  }

  private _setupDirect(call: Call): void {
    this._directSubscriptions.push(
      call.localStream$.subscribe((s) => (this._directLocalStream = s))
    );
  }

  private _teardownDirect(): void {
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
    this._directLocalStream = null;
  }

  /** Read the video track settings and set the CSS custom property. */
  private _detectAspectRatio(): void {
    const stream = this._effectiveStream;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const settings = track.getSettings();
    const w = settings.width;
    const h = settings.height;

    if (w && h && w > 0 && h > 0) {
      this._aspectRatio = `${w} / ${h}`;
      this.style.setProperty('--sw-local-camera-aspect', this._aspectRatio);
    }
  }

  render() {
    return html`
      <video part="video" autoplay playsinline muted></video>
      ${this._effectiveMuted
        ? html`<div part="placeholder" class="muted-overlay">
            <sw-ui-icon name="camera-off" size="28"></sw-ui-icon>
          </div>`
        : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-local-camera': SwLocalCamera;
  }
}
