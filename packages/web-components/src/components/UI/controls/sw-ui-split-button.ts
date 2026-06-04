import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { DropUpItem } from './sw-ui-dropup';
import { hostReset } from '../host-reset.js';

/**
 * Pill-shaped split button: main action + optional chevron dropdown.
 *
 * When `items` is non-empty, renders as a unified pill with a subtle
 * divider between the icon area and the chevron: `[ 🎤 | ▲ ]`
 *
 * When `items` is empty, renders as a single pill button.
 *
 * - **active/inactive** slots → toggle button, dispatches `sw-split-button-toggle`
 * - **default** slot only → push button, dispatches `sw-split-button-click`
 *
 * @slot active   - icon shown when active
 * @slot inactive - icon shown when inactive
 * @slot (default)- icon for a non-toggle button
 *
 * @fires sw-split-button-toggle - Fired on toggle-mode click. `detail` is the new active state (boolean).
 * @fires sw-split-button-click  - Fired on push-mode click. No detail.
 *
 * @cssprop --sw-split-button-size     [44px]  - height (width auto-fits content)
 * @cssprop --sw-split-button-bg       - button background (falls back to --bg-surface)
 * @cssprop --sw-split-button-bg-hover - hover background (falls back to --bg-surface-raised)
 * @cssprop --sw-split-button-color    - icon colour (falls back to --fg-default)
 * @cssprop --sw-split-button-radius   - border-radius (falls back to --radius-full)
 */
@customElement('sw-ui-split-button')
export class SwUiSplitButton extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: inline-flex;
      align-items: center;
    }

    /* Hide named slots by default; shown based on active state */
    slot[name='active'] { display: none; }
    :host([active='true']) slot[name='active'] { display: contents; }
    :host([active='true']) slot[name='inactive'] { display: none; }

    /* ── Unified pill container ─────────────────────────────────── */
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: var(--sw-split-button-radius, var(--radius-full));
      background: var(--sw-split-button-bg, var(--bg-surface));
      overflow: hidden;
      transition: background var(--transition-fast);
    }

    .pill:hover {
      background: var(--sw-split-button-bg-hover, var(--bg-surface-raised));
    }

    /* ── Click zones inside the pill ────────────────────────────── */
    .main, .chevron {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--sw-split-button-color, var(--fg-default));
      height: var(--sw-split-button-height, var(--sw-split-button-size, 40px));
    }

    .main {
      padding: 0 12px;
    }

    .chevron {
      padding: 0 6px;
      border-left: 1px solid var(--border-default);
    }

    .chevron sw-ui-icon {
      opacity: 0.7;
    }

    /* Hover highlights individual zones within the pill */
    .main:hover, .chevron:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    /* ── Solo button (no items → no chevron) ────────────────────── */
    .solo {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      height: var(--sw-split-button-height, var(--sw-split-button-size, 40px));
      padding: 0 14px;
      border-radius: var(--sw-split-button-radius, var(--radius-full));
      background: var(--sw-split-button-bg, var(--bg-surface));
      color: var(--sw-split-button-color, var(--fg-default));
      transition: background var(--transition-fast);
    }

    .solo:hover {
      background: var(--sw-split-button-bg-hover, var(--bg-surface-raised));
    }
  `];

  @property({
    converter: {
      fromAttribute(value: string | null): Array<DropUpItem | string> {
        if (!value) return [];
        try {
          const parsed: unknown = JSON.parse(value);
          return Array.isArray(parsed) ? (parsed as Array<DropUpItem | string>) : [];
        } catch {
          return [];
        }
      },
      toAttribute(value: Array<DropUpItem | string>): string {
        return JSON.stringify(value);
      }
    }
  })
  items: Array<DropUpItem | string> = [];

  @property({ reflect: true })
  active: boolean = false;

  @state()
  private _dropupOpen: boolean = false;

  @state()
  private _hasNamedSlots = false;

  @query('#chevron-zone')
  private _chevronBtn!: HTMLButtonElement;

  private _onDropupSelect(e: CustomEvent<DropUpItem>) {
    this.items = this.items.map((i) => {
      const id = typeof i === 'string' ? i : i.id;
      return typeof i === 'string'
        ? { label: i, id: i, selected: i === e.detail.id }
        : { ...i, selected: id === e.detail.id };
    });
  }

  private _updateNamedSlots() {
    const active = this.shadowRoot?.querySelector('slot[name="active"]') as HTMLSlotElement | null;
    const inactive = this.shadowRoot?.querySelector(
      'slot[name="inactive"]'
    ) as HTMLSlotElement | null;
    this._hasNamedSlots =
      (active?.assignedElements().length ?? 0) > 0 ||
      (inactive?.assignedElements().length ?? 0) > 0;
  }

  private _onMainClick() {
    if (!this._hasNamedSlots) {
      this.dispatchEvent(new CustomEvent('sw-split-button-click', { bubbles: true, composed: true }));
      return;
    }
    this.active = !this.active;
    this.dispatchEvent(
      new CustomEvent('sw-split-button-toggle', {
        detail: this.active,
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    const hasItems = this.items.length > 0;

    const iconSlots = html`
      <slot name="active" @slotchange=${this._updateNamedSlots}></slot>
      <slot name="inactive" @slotchange=${this._updateNamedSlots}></slot>
      ${!this._hasNamedSlots ? html`<slot></slot>` : nothing}
    `;

    if (!hasItems) {
      // Solo pill — no chevron
      return html`
        <button class="solo" part="button" @click=${this._onMainClick}>
          ${iconSlots}
        </button>
      `;
    }

    // Split pill — icon zone | divider | chevron zone
    return html`
      <div class="pill" part="button">
        <button class="main" @click=${this._onMainClick}>
          ${iconSlots}
        </button>
        <button class="chevron" part="chevron" id="chevron-zone"
          @click=${() => (this._dropupOpen = !this._dropupOpen)}>
          <sw-ui-icon name="chevron-up" size="14"></sw-ui-icon>
        </button>
      </div>
      <sw-ui-dropup
        .items=${this.items}
        .open=${this._dropupOpen}
        .anchor=${this._chevronBtn}
        @sw-dropup-close=${() => (this._dropupOpen = false)}
        @sw-dropup-select=${this._onDropupSelect}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-split-button': SwUiSplitButton;
  }
}
