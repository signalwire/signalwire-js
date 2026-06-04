import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../icons/sw-ui-icon.js';

/**
 * Fluid call layout that adapts to any container shape.
 *
 * Uses the container's **aspect ratio** (not just width) to decide whether
 * the transcript pane sits beside the video (landscape) or below it
 * (portrait / narrow). The video area is always maximised.
 *
 * ```
 * Wide (landscape):                Narrow (portrait):
 * ┌────────────────┬─────────┐    ┌─────────────────┐
 * │     VIDEO      │ TRANSCR │    │      VIDEO       │
 * │  (maximised)   │ (side)  │    │   (maximised)    │
 * ├────────────────┴─────────┤    ├──────────────────┤
 * │        CONTROLS           │    │    CONTROLS      │
 * └──────────────────────────┘    ├──────────────────┤
 *                                  │    TRANSCRIPT    │
 *                                  └──────────────────┘
 * ```
 *
 * @slot video            - main video content
 * @slot background       - element behind the video (e.g. `<sw-ui-background>`)
 * @slot floating-video   - picture-in-picture overlay (absolute, bottom-right)
 * @slot controls         - control bar beneath the video
 * @slot transcript       - transcript panel (side or bottom)
 *
 * @prop {boolean} transcript - show / hide the transcript pane
 * @prop {boolean} loading    - show a spinner overlay on the video area
 * @prop {boolean} shadow     - apply a drop shadow to the host
 * @prop {boolean} fullscreen - (read-only) reflects the current fullscreen state
 *
 * @method toggleTranscript()  - flip the transcript pane open / closed
 * @method toggleFullscreen()  - enter or exit fullscreen
 * @method requestFullscreen() - inherited, enters fullscreen
 * @method exitFullscreen()    - static, exits fullscreen
 *
 * @cssprop --sw-call-layout-radius [0]                   - border-radius on external corners
 * @cssprop --sw-call-layout-shadow                     - box-shadow when `shadow` is set
 * @cssprop --sw-call-layout-loading-bg [rgba(0,0,0,0.6)]    - loading overlay background
 * @cssprop --loading-spinner-size [48]        - spinner icon size (px, number)
 * @cssprop --sw-call-layout-transcript-transition [350ms ease-in-out] - open/close transition
 * @cssprop --sw-call-layout-pip-width [clamp(100px, 20%, 200px)]  - PiP container width
 * @cssprop --sw-call-layout-pip-radius [8px]               - PiP border-radius
 * @cssprop --sw-call-layout-pip-shadow [0 2px 8px rgba(0,0,0,0.5)] - PiP box-shadow
 * @cssprop --sw-call-layout-pip-bottom [12px]              - PiP offset from bottom
 * @cssprop --sw-call-layout-pip-right [12px]               - PiP offset from right
 */
@customElement('sw-ui-call-layout')
export class SwUiCallLayout extends LitElement {
  @property({ type: Boolean, reflect: true }) transcript = false;
  @property({ type: Boolean, reflect: true }) loading = false;
  @property({ type: Boolean, reflect: true }) shadow = false;
  @state() private _fullscreen = false;

  /** Reflects as an attribute so CSS can target `:host([fullscreen])`. */
  get fullscreen(): boolean {
    return this._fullscreen;
  }

  toggleTranscript(): void {
    this.transcript = !this.transcript;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      this.requestFullscreen().catch(() => {});
    }
  }

  private _onFullscreenChange = (): void => {
    const isFs = document.fullscreenElement === this;
    if (this._fullscreen !== isFs) {
      this._fullscreen = isFs;
      if (isFs) {
        this.setAttribute('fullscreen', '');
      } else {
        this.removeAttribute('fullscreen');
      }
    }
  };

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
  }

  static styles = css`
    /* ================================================================== *
     *  HOST                                                              *
     * ================================================================== */
    :host {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: var(--sw-call-layout-radius, var(--radius-md));
      overflow: hidden;
      font-family: var(--type-family-body);
      container-type: size;
    }

    :host([shadow]) {
      box-shadow: var(--sw-call-layout-shadow, var(--shadow-md));
    }

    /* ================================================================== *
     *  FULLSCREEN                                                        *
     * ================================================================== */
    :host([fullscreen]) {
      border-radius: 0;
      box-shadow: none;
      width: 100vw;
      height: 100vh;
      background: black;
    }

    /* ================================================================== *
     *  GRID — wide (landscape) default                                   *
     * ================================================================== */
    .root {
      display: grid;
      height: 100%;
      grid-template-rows: 1fr auto;
      grid-template-columns: 1fr 0fr;
      grid-template-areas:
        'video transcript'
        'controls controls';
    }

    :host([transcript]) .root {
      grid-template-columns: 1fr minmax(180px, 0.25fr);
    }

    /* ================================================================== *
     *  VIDEO AREA                                                        *
     * ================================================================== */
    .video {
      grid-area: video;
      display: grid;
      grid-template: 1fr / 1fr;
      position: relative;
      overflow: hidden;
      min-height: 0;
      min-width: 0;
    }

    /* ── Background layer ───────────────────────────────────────────── */
    slot[name='background'] {
      display: contents;
    }

    ::slotted([slot='background']) {
      grid-area: 1 / 1;
      z-index: 0;
      overflow: hidden;
    }

    /* ── Video content layer ────────────────────────────────────────── */
    .video-content {
      grid-area: 1 / 1;
      z-index: 1;
      min-height: 0;
      min-width: 0;
    }

    /* ── Floating PiP ───────────────────────────────────────────────── */
    .floating-video {
      position: absolute;
      bottom: var(--sw-call-layout-pip-bottom, 12px);
      right: var(--sw-call-layout-pip-right, 12px);
      width: var(--sw-call-layout-pip-width, clamp(80px, 20%, 200px));
      max-width: calc(100% - var(--sw-call-layout-pip-right, 12px) * 2);
      max-height: calc(100% - var(--sw-call-layout-pip-bottom, 12px) * 2);
      border-radius: var(--sw-call-layout-pip-radius, var(--radius-md));
      box-shadow: var(--sw-call-layout-pip-shadow, var(--shadow-md));
      overflow: hidden;
      z-index: 3;
    }

    /* ── Loading overlay ────────────────────────────────────────────── */
    .loading-overlay {
      grid-area: 1 / 1;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sw-call-layout-loading-bg, rgba(0, 0, 0, 0.6));
    }

    .spinner {
      animation: spin 1s linear infinite;
      color: rgba(255, 255, 255, 0.85);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* ================================================================== *
     *  CONTROLS                                                          *
     * ================================================================== */
    .controls {
      grid-area: controls;
      position: relative;
      z-index: 10;
      overflow: visible;
      min-width: 0;
    }

    /* ================================================================== *
     *  TRANSCRIPT PANE                                                   *
     * ================================================================== */
    .transcript-pane {
      grid-area: transcript;
      overflow: hidden;
      min-width: 0;
      min-height: 0;

      /* Animate width via grid + clip the overflow during collapse */
      transition: opacity 350ms ease-in-out;
      opacity: 0;
    }

    :host([transcript]) .transcript-pane {
      opacity: 1;
    }

    .transcript-inner {
      height: 100%;
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ================================================================== *
     *  NARROW / PORTRAIT — aspect-ratio <= ~4:3                          *
     * ================================================================== */
    @container (max-aspect-ratio: 4/3) {
      .root {
        grid-template-rows: 1fr auto 0fr;
        grid-template-columns: 1fr;
        grid-template-areas:
          'video'
          'controls'
          'transcript';
      }

      /* Cap the video so it doesn't hog all space — leave room for
         transcript.  minmax(0, 3fr) keeps the video dominant but allows
         the transcript row to claim meaningful space. */
      :host([transcript]) .root {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(0, 3fr) auto minmax(120px, 2fr);
      }
    }

    /* ================================================================== *
     *  VERY WIDE — show transcript narrower                              *
     * ================================================================== */
    @container (min-aspect-ratio: 21/9) {
      :host([transcript]) .root {
        grid-template-columns: 1fr minmax(160px, 0.15fr);
      }
    }

    /* ================================================================== *
     *  TINY CONTAINER GUARDS                                             *
     * ================================================================== */
    @container (max-width: 240px) {
      .floating-video {
        display: none;
      }
    }

    @container (max-width: 200px), (max-height: 200px) {
      .transcript-pane {
        display: none;
      }
    }
  `;

  render() {
    return html`
      <div class="root">
        <div class="video">
          <slot name="background"></slot>
          <div class="video-content">
            <slot name="video"></slot>
          </div>
          <div class="floating-video">
            <slot name="floating-video"></slot>
          </div>
          ${this.loading
            ? html`<div class="loading-overlay">
                <sw-ui-icon
                  class="spinner"
                  name="spinner"
                  .size=${48}
                ></sw-ui-icon>
              </div>`
            : nothing}
        </div>
        <div class="controls">
          <slot name="controls"></slot>
        </div>
        <div class="transcript-pane">
          <div class="transcript-inner">
            <slot name="transcript"></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-call-layout': SwUiCallLayout;
  }
}
