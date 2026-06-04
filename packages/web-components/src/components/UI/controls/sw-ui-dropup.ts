import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { hostReset } from '../host-reset.js';

export type DropUpItem = { label: string; id: string; selected?: boolean };

/**
 * Dropdown (opens upward) menu anchored to a trigger element.
 *
 * @fires sw-dropup-select - User picked an item. `detail` is the selected `DropUpItem`.
 * @fires sw-dropup-close  - Outside click closed the menu.
 *
 * @cssprop --sw-dropup-offset    [4px]                    - gap between anchor and menu
 * @cssprop --sw-dropup-max-width [200px]                  - maximum menu width
 * @cssprop --sw-dropup-bg        [#1f2937]                - menu background
 * @cssprop --sw-dropup-border    [1px solid rgba(255,255,255,0.1)] - menu border
 * @cssprop --sw-dropup-radius    [8px]                    - menu border-radius
 * @cssprop --sw-dropup-shadow    [0 4px 12px rgba(0,0,0,0.4)]     - menu box-shadow
 * @cssprop --sw-dropup-color     [#e5e7eb]                - item text colour
 * @cssprop --sw-dropup-item-hover  [rgba(255,255,255,0.08)] - item hover background
 * @cssprop --sw-dropup-item-active [rgba(255,255,255,0.15)] - selected item background
 */
@customElement('sw-ui-dropup')
export class SwUiDropup extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: inline-block;
      position: relative;
    }

    .menu {
      position: absolute;
      bottom: calc(100% + var(--sw-dropup-offset, 4px));
      left: 0;
      display: none;
      flex-direction: column;
      border: 1px solid var(--border-default);
      background: var(--bg-page);
      color: var(--fg-default);
      font-family: var(--type-family-body);
      font-size: var(--type-size-small);
      min-width: 120px;
      max-width: var(--sw-dropup-max-width, 200px);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .menu.open {
      display: flex;
    }

    button {
      all: unset;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 0.8125rem;
      transition: background var(--transition-fast);
    }

    button.selected {
      background: var(--bg-surface-raised);
    }

    button:hover {
      background: var(--bg-surface);
    }
  `];

  @property({
    reflect: true,
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

  @property({ type: Boolean, reflect: true })
  open = false;

  // Optional element treated as "inside" for outside-click AND used as the position anchor
  @property({ attribute: false })
  anchor?: Element;

  @query('.menu')
  private _menu!: HTMLElement;

  private _outsideClickHandler = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this) && (!this.anchor || !path.includes(this.anchor))) {
      this.dispatchEvent(new CustomEvent('sw-dropup-close', { bubbles: true, composed: true }));
    }
  };

  updated(changed: Map<string, unknown>) {
    if (!changed.has('open')) return;

    if (this.open) {
      document.addEventListener('mousedown', this._outsideClickHandler);
      if (this.anchor) {
        this._positionToAnchor();
      }
    } else {
      document.removeEventListener('mousedown', this._outsideClickHandler);
    }
  }

  private _positionToAnchor() {
    const rect = this.anchor!.getBoundingClientRect();
    const offset = 4;
    this._menu.style.position = 'fixed';
    this._menu.style.top = `${rect.top - offset}px`;
    this._menu.style.bottom = 'auto';
    this._menu.style.left = `${rect.left + rect.width / 2}px`;
    this._menu.style.right = 'auto';
    this._menu.style.transform = 'translateX(-50%) translateY(-100%)';
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousedown', this._outsideClickHandler);
  }

  private normalizeItem(item: DropUpItem | string): DropUpItem {
    if (typeof item === 'string') {
      return { label: item, id: item, selected: false };
    }
    return item;
  }

  private onSelect(item: DropUpItem) {
    const selectedItem = { ...item, selected: true };
    this.items = (this.items ?? []).map((i) => {
      const normalized = this.normalizeItem(i);
      return { ...normalized, selected: normalized.id === item.id };
    });
    this.dispatchEvent(
      new CustomEvent('sw-dropup-select', {
        detail: selectedItem,
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    const list = (this.items ?? []).map((i) => {
      const item = this.normalizeItem(i);
      return html`
        <button
          part="item"
          @click=${() => this.onSelect(item)}
          class=${item.selected === true ? 'selected' : ''}
        >
          ${item.label}
        </button>
      `;
    });

    return html`
      <div part="menu" class="menu ${this.open ? 'open' : ''}">${list.length ? list : nothing}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-dropup': SwUiDropup;
  }
}
