import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ICONS } from './icons';
import type { IconName } from './icons';

const DEFAULT_SIZE = 24;

/**
 * Inline SVG icon component. All SVG raw imports are isolated inside the icons folder.
 *
 * @attr name - Icon name (e.g. "mic-on", "camera-off"). See IconName for all values.
 * @attr size - Size in pixels applied as width and height on the SVG (default: 24).
 *
 * @example
 * <sw-ui-icon name="mic-on"></sw-ui-icon>
 * <sw-ui-icon name="phone-end" size="32"></sw-ui-icon>
 * <sw-ui-icon name="settings" slot="icon"></sw-ui-icon>
 *
 * The inline SVG inherits `color` from the host (use `currentColor` in
 * stylesheets). Sizing is controlled via the `size` attribute, not CSS parts.
 */
@customElement('sw-ui-icon')
export class SwUiIcon extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    svg {
      display: block;
    }
  `;

  @property({ reflect: true }) name: IconName = 'close';
  @property({ type: Number }) size: number = DEFAULT_SIZE;

  render() {
    const raw = ICONS[this.name];

    if (!raw) {
      return html``;
    }

    const sized = raw.replace('<svg', `<svg width="${this.size}" height="${this.size}"`);

    return html`${unsafeHTML(sized)}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-icon': SwUiIcon;
  }
}
