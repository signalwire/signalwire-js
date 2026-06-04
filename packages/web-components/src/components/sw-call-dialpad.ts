/**
 * Call Dialpad Component
 *
 * Wrapper around `sw-dialpad` that integrates with a Call.
 * When a call is connected, digit presses send DTMF tones.
 * When no call is active, the dial event bubbles up for the parent to handle.
 *
 * Input precedence (most specific wins): `.call` > context.
 *
 * @example
 * ```html
 * <sw-call-dialpad></sw-call-dialpad>
 * <sw-call-dialpad .call=${call}></sw-call-dialpad>
 * <sw-call-dialpad show-call-button @sw-dial=${onDial}></sw-call-dialpad>
 * ```
 *
 * @csspart container    - Outer dialpad container.
 * @csspart display      - Number / text display field.
 * @csspart keypad       - Grid of digit keys.
 * @csspart key          - Individual digit button.
 * @csspart key-pressed  - Digit button while pressed.
 * @csspart call-button  - The call button (when `show-call-button`).
 *
 * @fires sw-digit-press - A digit was pressed. Detail: `{ digit: string, digits: string }`.
 * @fires sw-dial        - User pressed the call button. Detail: `{ digits: string }`.
 */

import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import type { CallStatus } from '@signalwire/js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { Call } from '../types/index.js';
import { getLogger } from '@signalwire/js';
import './UI/controls/sw-ui-dialpad.js';

const logger = getLogger();

@customElement('sw-call-dialpad')
export class SwCallDialpad extends LitElement {
  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  /** Explicit Call — when set, drives DTMF directly and bypasses context. */
  @property({ type: Object }) call?: Call;

  @state() private _directStatus: CallStatus | null = null;

  private _directSubscriptions: Subscription[] = [];

  /** Whether to display the call button below the keypad. */
  @property({ type: Boolean, reflect: true, attribute: 'show-call-button' })
  showCallButton = false;

  /** Allow free-text input in the display field (e.g., SIP URIs, vanity letters). */
  @property({ type: Boolean, reflect: true, attribute: 'allow-text' })
  allowText = false;

  /** Placeholder text shown in the digit display input. */
  @property({ type: String })
  placeholder = 'Enter number';

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('call')) {
      this._directSubscriptions.forEach((s) => s.unsubscribe());
      this._directSubscriptions = [];
      this._directStatus = null;
      if (this.call) {
        this._directSubscriptions.push(
          this.call.status$.subscribe((s) => (this._directStatus = s))
        );
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
  }

  private _onDigitPress(e: CustomEvent<{ digit: string; digits: string }>) {
    const { digit } = e.detail;
    const status = this.call ? this._directStatus : this._callState?.status;
    if (status !== 'connected') return;

    const send = this.call
      ? (d: string) => this.call!.sendDigits(d)
      : this._callState?.sendDigits;
    send?.(digit).catch((err: unknown) => {
      logger.error('Failed to send DTMF:', err);
    });
  }

  render() {
    return html`
      <sw-ui-dialpad
        exportparts="container,display,keypad,key,key-pressed,call-button"
        ?show-call-button=${this.showCallButton}
        ?allow-text=${this.allowText}
        placeholder=${this.placeholder}
        @sw-digit-press=${this._onDigitPress}
      ></sw-ui-dialpad>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-dialpad': SwCallDialpad;
  }
}
