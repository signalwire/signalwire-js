import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * Wrap elements with this to make them modal.
 *
 * @slot   - Dialog content.
 * @fires sw-modal-close - Cancelable. Fired on ESC or backdrop click; call
 *                         `preventDefault()` to keep the modal open.
 */

@customElement('sw-ui-modal')
export class SwUiModal extends LitElement {
  static styles = css`
    :host {
      --sw-modal-duration: 0.2s;
      --sw-modal-animation: bounce-in var(--sw-modal-duration) ease-out;
      --sw-modal-close-animation: bounce-out var(--sw-modal-duration) ease-out;
      --sw-modal-backdrop-animation: backdrop-in var(--sw-modal-duration) ease-out;
      --sw-modal-backdrop-close-animation: backdrop-out var(--sw-modal-duration) ease-out;
    }
    dialog {
      border: none;
      padding: 0;
      background: transparent;
      animation: var(--sw-modal-animation);
      animation-fill-mode: backwards;
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.5);
      animation: var(--sw-modal-backdrop-animation);
    }

    @keyframes bounce-in {
      from {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
      }
      30% {
        opacity: 1;
      }
      70% {
        transform: scale(1.1) translateY(-5px);
      }
      to {
        transform: scale(1) translateY(0);
      }
    }
    @keyframes slide-up {
      from {
        transform: translateY(1000px);
      }

      to {
        transform: translateY(0);
      }
    }

    @keyframes backdrop-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes bounce-out {
      from {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      30% {
        transform: scale(1.1) translateY(-5px);
      }
      70% {
        opacity: 1;
      }
      to {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
      }
    }

    @keyframes backdrop-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    dialog.closing {
      animation: var(--sw-modal-close-animation);
    }

    dialog.closing::backdrop {
      animation: var(--sw-modal-backdrop-close-animation);
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @query('dialog')
  private dialog!: HTMLDialogElement;

  private _savedOverflow: string | null = null;

  updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._savedOverflow = document.body.style.overflow;
        this.dialog.showModal();
        document.body.style.overflow = 'hidden';
      } else if (this.dialog.open) {
        this._animateClose();
      }
    }
  }

  private _animateClose(): void {
    this.dialog.classList.add('closing');
    const onClose = (e: AnimationEvent) => {
      if (e.target !== this.dialog) return;
      this.dialog.removeEventListener('animationend', onClose);
      this.dialog.classList.remove('closing');
      this.dialog.close();
      if (this._savedOverflow !== null) {
        document.body.style.overflow = this._savedOverflow;
        this._savedOverflow = null;
      }
    };
    this.dialog.addEventListener('animationend', onClose);
  }

  /** ESC key — intercept native close and route through `_requestClose`. */
  private _handleCancel = (e: Event): void => {
    e.preventDefault();
    this._requestClose();
  };

  /** Backdrop click — the `<dialog>` itself is the backdrop target. */
  private _handleBackdropClick = (e: MouseEvent): void => {
    if (e.target === this.dialog) {
      this._requestClose();
    }
  };

  /** Dispatch a cancelable `sw-modal-close`; only close if not prevented. */
  private _requestClose(): void {
    const ev = new CustomEvent('sw-modal-close', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    if (this.dispatchEvent(ev)) {
      this.open = false;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => {
      this.dialog.addEventListener('cancel', this._handleCancel);
      this.dialog.addEventListener('click', this._handleBackdropClick);
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.dialog.removeEventListener('cancel', this._handleCancel);
    this.dialog.removeEventListener('click', this._handleBackdropClick);
  }

  render() {
    return html`<dialog part="dialog backdrop">
      <div part="panel"><slot></slot></div>
    </dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-modal': SwUiModal;
  }
}
