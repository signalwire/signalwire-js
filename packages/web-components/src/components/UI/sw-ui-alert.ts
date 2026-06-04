import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { hostReset } from './host-reset.js';

export type PromptType = 'confirm' | 'alert';

/**
 * Confirmation/alert prompt dialog
 *
 * @slot description content (falls back to the `description` property)
 */
@customElement('sw-ui-alert')
export class SwUiAlert extends LitElement {
  static styles = [hostReset, css`
    :host {
      font-family: var(--type-family-body);
    }

    dialog {
      border: none;
      border-radius: var(--radius-md);
      padding: 24px;
      min-width: 280px;
      max-width: 400px;
      box-shadow: var(--shadow-md);
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.4);
    }

    .title {
      margin: 0 0 12px;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .body {
      margin: 0 0 20px;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .accept {
      background: var(--interactive-button-primary-bg);
      color: white;
    }

    .accept:hover {
      background: var(--interactive-button-primary-hover);
    }

    .reject {
      background: #f3f4f6;
      color: #374151;
    }

    .reject:hover {
      background: #e5e7eb;
    }
  `];

  @property() declare title: string;
  @property() description = '';
  @property({ reflect: true }) type: PromptType = 'confirm';

  @query('dialog') private _dialog!: HTMLDialogElement;

  private _resolve: ((value: boolean) => void) | null = null;

  /** Opens the prompt and returns a promise that resolves with the user's choice. */
  show(): Promise<boolean> {
    this._dialog.showModal();
    return new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  private _close(value: boolean) {
    this._resolve?.(value);
    this._resolve = null;
    this._dialog.close();
  }

  render() {
    return html`
      <dialog>
        <h2 class="title">${this.title}</h2>
        <div class="body">
          <slot>${this.description}</slot>
        </div>
        <div class="actions">
          ${this.type === 'confirm'
            ? html`
                <button class="reject" @click=${() => this._close(false)}>Reject</button>
                <button class="accept" @click=${() => this._close(true)}>Accept</button>
              `
            : html` <button class="accept" @click=${() => this._close(true)}>OK</button> `}
        </div>
      </dialog>
    `;
  }
}

/**
 * Programmatically show a prompt and await the user's response.
 *
 * @example
 * const confirmed = await showPrompt({ title: "Delete item?", type: "confirm" });
 * const ack = await showPrompt({ title: "Done!", type: "alert" });
 */
export async function showPrompt(options: {
  title: string;
  description?: string;
  type?: PromptType;
}): Promise<boolean> {
  const el = document.createElement('sw-ui-alert') as SwUiAlert;
  el.title = options.title;
  if (options.description !== undefined) el.description = options.description;
  if (options.type !== undefined) el.type = options.type;
  document.body.appendChild(el);
  await el.updateComplete;
  const result = await el.show();
  el.remove();
  return result;
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-alert': SwUiAlert;
  }
}
