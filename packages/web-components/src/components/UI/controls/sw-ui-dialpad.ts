/**
 * Dialpad Component
 *
 * A 12-key telephone keypad (0-9, *, #) for entering phone numbers
 * and sending DTMF tones during active calls. Pure UI component — no
 * call logic. Use `sw-call-dialpad` for a version that integrates with
 * a call context.
 *
 * @example
 * ```html
 * <sw-dialpad show-call-button></sw-dialpad>
 * ```
 *
 * Long-press behavior:
 * - Long-press the `0` key → inserts `+` (international prefix).
 * - Long-press the backspace button → clears the entire buffer.
 *
 * @fires sw-digit-press       - Fired when a digit button is pressed. Detail: `{ digit: string, digits: string }`
 * @fires sw-dialpad-backspace - Fired when the backspace button is pressed (or long-pressed to clear). Detail: `{ digits: string }`
 * @fires sw-dial              - Fired when the call button is pressed. Detail: `{ digits: string }`
 * @fires sw-dialpad-input     - Fired when free-text input changes (only when `allow-text` is set). Detail: `{ digits: string }`
 *
 * @cssprop [--interactive-button-primary-bg=#044ef4] - Primary accent color.
 * @cssprop [--interactive-button-primary-hover=#0342cf] - Primary color on hover.
 * @cssprop [--interactive-status-success=#22c55e] - Success/call button color.
 * @cssprop [--interactive-button-destructive-bg=#dc2626] - Danger/hangup button color.
 * @cssprop [--bg-surface=#181a28] - Component background.
 * @cssprop [--fg-default=#f0f0f4] - Text color.
 * @cssprop [--fg-muted=#a0a0aa] - Muted text color.
 * @cssprop [--border-default=rgba(255,255,255,0.12)] - Border color.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../icons/sw-ui-icon.js';
import { hostReset } from '../host-reset.js';

const DTMF_PATTERN = /^[0-9*#]$/;
const LONG_PRESS_MS = 500;

/**
 * Key layout for standard telephone keypad
 */
const KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' }
] as const;

@customElement('sw-ui-dialpad')
export class SwUiDialpad extends LitElement {
  static styles = [hostReset, css`
    :host {
      --sw-dialpad-display-size: 32px;
      --sw-dialpad-key-size: 24px;
      display: block;
      font-family: var(--type-family-body);
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      padding: var(--sp-4);
      max-width: 280px;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
    }

    .display {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--sp-3) var(--sp-4);
      background: var(--bg-surface-raised);
      border-radius: var(--radius-md);
      min-height: 48px;
    }

    .display-input {
      flex: 1;
      font-size: var(--sw-dialpad-display-size);
      font-weight: 500;
      font-family: var(--type-family-body);
      color: var(--fg-default);
      background: transparent;
      border: none;
      outline: none;
      letter-spacing: 2px;
      text-align: center;
      width: 100%;
    }

    .display-input::placeholder {
      color: var(--fg-muted);
      font-size: var(--type-size-body);
      letter-spacing: normal;
    }

    .backspace-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--fg-muted);
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .backspace-button:hover {
      background: var(--interactive-dropdown-hover);
      color: var(--fg-default);
    }

    .backspace-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .backspace-button sw-ui-icon {
      pointer-events: none;
    }

    .keypad {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 72px));
      justify-content: center;
      gap: var(--sp-2);
    }

    .key {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      aspect-ratio: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      cursor: pointer;
      transition:
        background-color 0.1s ease,
        transform 0.1s ease;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .key:hover {
      background: var(--bg-surface-raised);
    }

    .key:active,
    .key.pressed {
      background: var(--interactive-dropdown-hover);
      transform: scale(0.95);
    }

    .key-digit {
      font-size: var(--sw-dialpad-key-size);
      font-weight: 500;
      color: var(--fg-default);
      line-height: 1;
    }

    .key-letters {
      font-size: var(--type-size-caption);
      color: var(--fg-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
      min-height: 14px;
    }

    .call-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 56px;
      background: var(--interactive-status-success);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: white;
      font-size: var(--type-size-body);
      font-weight: 600;
      font-family: var(--type-family-body);
      transition: background-color 0.15s ease;
      gap: var(--sp-2);
    }

    .call-button:hover {
      background: #0ea472;
    }

    .call-button:active {
      background: #0d9668;
    }

    .call-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .call-button sw-ui-icon {
      pointer-events: none;
    }
  `];

  /** Whether to display the call button below the keypad. */
  @property({ type: Boolean, reflect: true, attribute: 'show-call-button' })
  showCallButton: boolean = false;

  /** Allow free-text input in the display field (e.g., SIP URIs, vanity letters). Keypad buttons still append DTMF digits. */
  @property({ type: Boolean, reflect: true, attribute: 'allow-text' })
  allowText: boolean = false;

  /** Placeholder text shown in the digit display input. */
  @property({ type: String })
  placeholder: string = 'Enter number';

  @state() private digits: string = '';
  @state() private pressedKey: string | null = null;

  private _longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private _longPressFired = false;

  private _startLongPress(action: () => void) {
    this._cancelLongPress();
    this._longPressFired = false;
    this._longPressTimer = setTimeout(() => {
      this._longPressFired = true;
      this._longPressTimer = null;
      action();
    }, LONG_PRESS_MS);
  }

  private _cancelLongPress() {
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  override disconnectedCallback() {
    this._cancelLongPress();
    super.disconnectedCallback();
  }

  private _clearAll() {
    if (this.digits.length === 0) return;
    this.digits = '';
    this.dispatchEvent(
      new CustomEvent('sw-dialpad-backspace', {
        detail: { digits: this.digits },
        bubbles: true,
        composed: true
      })
    );
  }

  private _pressDigit(digit: string) {
    this.digits += digit;
    this.pressedKey = digit;

    this.dispatchEvent(
      new CustomEvent('sw-digit-press', {
        detail: { digit, digits: this.digits },
        bubbles: true,
        composed: true
      })
    );

    setTimeout(() => {
      this.pressedKey = null;
    }, 100);
  }

  private _backspace() {
    if (this.digits.length === 0) return;
    this.digits = this.digits.slice(0, -1);
    this.dispatchEvent(
      new CustomEvent('sw-dialpad-backspace', {
        detail: { digits: this.digits },
        bubbles: true,
        composed: true
      })
    );
  }

  private _dial() {
    if (this.digits.length === 0) return;
    this.dispatchEvent(
      new CustomEvent('sw-dial', {
        detail: { digits: this.digits },
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * Handle keyboard input on the display field.
   * We intercept all keys and manage state ourselves to prevent the browser
   * from accumulating non-DTMF characters in the input value.
   */
  private _onKeyDown(e: KeyboardEvent) {
    const { key } = e;

    if (this.allowText) {
      if (key === 'Enter' && this.showCallButton) {
        e.preventDefault();
        this._dial();
      }
      return;
    }

    if (DTMF_PATTERN.test(key)) {
      e.preventDefault();
      this._pressDigit(key);
    } else if (key === 'Backspace') {
      e.preventDefault();
      this._backspace();
    } else if (key === 'Enter' && this.showCallButton) {
      e.preventDefault();
      this._dial();
    } else if (key !== 'Tab' && !e.ctrlKey && !e.metaKey) {
      // Block all other printable characters
      e.preventDefault();
    }
  }

  private _onInput(e: Event) {
    if (!this.allowText) return;
    const value = (e.target as HTMLInputElement).value;
    this.digits = value;
    this.dispatchEvent(
      new CustomEvent('sw-dialpad-input', {
        detail: { digits: this.digits },
        bubbles: true,
        composed: true
      })
    );
  }

  render() {
    return html`
      <div class="container" part="container">
        <div class="display" part="display">
          <input
            type=${this.allowText ? 'text' : 'tel'}
            class="display-input"
            .value=${this.digits}
            placeholder=${this.placeholder}
            @keydown=${this._onKeyDown}
            @input=${this._onInput}
            aria-label="Phone number input"
          />
          <button
            class="backspace-button"
            @click=${() => {
              if (this._longPressFired) { this._longPressFired = false; return; }
              this._backspace();
            }}
            @pointerdown=${() => this._startLongPress(() => this._clearAll())}
            @pointerup=${() => this._cancelLongPress()}
            @pointerleave=${() => this._cancelLongPress()}
            @pointercancel=${() => this._cancelLongPress()}
            ?disabled=${this.digits.length === 0}
            aria-label="Delete last digit (long-press to clear)"
          >
            <sw-ui-icon name="backspace" size="24"></sw-ui-icon>
          </button>
        </div>

        <div class="keypad" part="keypad" role="group" aria-label="Telephone keypad">
          ${KEYS.map(
            (key) => html`
              <button
                class="key ${this.pressedKey === key.digit ? 'pressed' : ''}"
                part="key ${this.pressedKey === key.digit ? 'key-pressed' : ''}"
                @click=${() => {
                  if (this._longPressFired) { this._longPressFired = false; return; }
                  this._pressDigit(key.digit);
                }}
                @pointerdown=${key.digit === '0'
                  ? () => this._startLongPress(() => this._pressDigit('+'))
                  : undefined}
                @pointerup=${key.digit === '0' ? () => this._cancelLongPress() : undefined}
                @pointerleave=${key.digit === '0' ? () => this._cancelLongPress() : undefined}
                @pointercancel=${key.digit === '0' ? () => this._cancelLongPress() : undefined}
                aria-label="${key.digit}${key.letters ? `, ${key.letters}` : ''}${
                  key.digit === '0' ? ' (long-press for +)' : ''
                }"
              >
                <span class="key-digit">${key.digit}</span>
                <span class="key-letters">${key.letters}</span>
              </button>
            `
          )}
        </div>

        ${this.showCallButton
          ? html`
              <button
                class="call-button"
                part="call-button"
                @click=${this._dial}
                ?disabled=${this.digits.length === 0}
                aria-label="Call ${this.digits}"
              >
                <sw-ui-icon name="phone-call" size="20"></sw-ui-icon> Call
              </button>
            `
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-dialpad': SwUiDialpad;
  }
}
