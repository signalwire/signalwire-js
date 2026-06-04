import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  DEFAULT_BACKGROUND_IMAGE,
  DEFAULT_BACKGROUND_THUMBNAIL,
} from '../DEFAULT_BACKGROUND';

/**
 * Video background with a blurred thumbnail placeholder that crossfades into
 * the full-resolution image once it has finished loading.
 *
 * Slot this into `sw-ui-call-layout`'s `background` slot.
 *
 * @prop {boolean} [default]    - Use the built-in SignalWire background image
 * @prop {string}  thumbnail    - Data URL shown immediately as a blurred preview
 * @prop {string}  src          - URL of the full-resolution background image
 * @prop {string}  [blurAmount] - CSS blur amount applied to the thumbnail (default: 20px)
 *
 * @csspart thumb - Blurred low-res thumbnail layer.
 * @csspart image - Full-resolution image layer (fades in once loaded).
 */
@customElement('sw-ui-background')
export class SwUiBackground extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative; /* containing block for .thumb and img */
      overflow: hidden;
    }

    .thumb {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      transform: scale(1.1); /* prevents blur edge fringing */
      opacity: 1;
      transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .thumb.hidden {
      opacity: 0;
    }

    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.03);
      transition:
        opacity 600ms cubic-bezier(0.4, 0, 0.2, 1),
        transform 700ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    img.loaded {
      opacity: 1;
      transform: scale(1);
    }
  `;

  @property({ type: Boolean, reflect: true }) default = false;
  @property({ type: String }) thumbnail?: string;
  @property({ type: String }) src?: string;
  @property({ type: String, attribute: 'blur-amount' }) blurAmount = '20px';

  @state() private _loaded = false;

  private get _src() {
    return this.default ? DEFAULT_BACKGROUND_IMAGE : this.src;
  }

  private get _thumbnail() {
    return this.default ? DEFAULT_BACKGROUND_THUMBNAIL : this.thumbnail;
  }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('src') || changed.has('default')) {
      this._loaded = false;
    }
  }

  render() {
    return html`
      ${this._thumbnail
        ? html`<div
            part="thumb"
            class=${`thumb${this._loaded ? ' hidden' : ''}`}
            style=${styleMap({
              'background-image': `url('${this._thumbnail}')`,
              filter: `blur(${this.blurAmount})`,
            })}
          ></div>`
        : nothing}
      ${this._src
        ? html`<img
            part="image"
            class=${this._loaded ? 'loaded' : ''}
            src=${this._src}
            alt=""
            @load=${() => {
              this._loaded = true;
            }}
          />`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-background': SwUiBackground;
  }
}
