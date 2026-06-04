import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './sw-call-widget/sw-call-widget.js';
import './UI/layout/sw-ui-background.js';
import './UI/icons/sw-ui-icon.js';
import { hostReset } from './UI/host-reset.js';

/**
 * Click-to-call button that opens a full call widget.
 *
 * Thin wrapper around `sw-call-widget` in modal mode. Renders a styled
 * call button; clicking it dials the preconfigured destination and opens
 * the call UI in a modal overlay.
 *
 * @prop {string} token       - SignalWire SAT or embed token
 * @prop {string} host        - Optional server host
 * @prop {string} destination - Call destination (address or resource)
 * @prop {string} label       - Button text (default "Call")
 * @prop {boolean} audioOnly  - Audio-only mode (no video send/receive)
 *
 * @fires sw-dial        - Fired when the call is initiated. Detail: `{ destination }`.
 * @fires sw-call-ended  - Fired when the call reaches a terminal state (any reason). Detail: `{ status }`.
 * @fires sw-call-hangup - Fired when the user clicks the hangup button (does not fire on remote disconnect).
 *
 * Themed via the SignalWire DTCG tokens (`--interactive-status-success`,
 * `--type-family-body`, `--type-size-body`, `--radius-md`, `--transition-fast`).
 */
@customElement('sw-click-to-call')
export class SwClickToCall extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: inline-block;
      font-family: var(--type-family-body);
    }

    .call-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--interactive-status-success);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: var(--type-size-body);
      font-weight: 600;
      cursor: pointer;
      transition: filter var(--transition-fast), transform 0.1s ease;
    }

    .call-button:hover {
      filter: brightness(0.9);
    }

    .call-button:active {
      transform: scale(0.98);
    }

    .call-button sw-ui-icon {
      pointer-events: none;
    }
  `];

  @property({ type: String }) token = '';
  @property({ type: String }) host = '';
  @property({ type: String }) destination = '';
  @property({ type: String }) label = 'Call';
  @property({ type: Boolean, reflect: true, attribute: 'audio-only' }) audioOnly = false;

  render() {
    return html`
      <sw-call-widget
        modal
        transcription
        ?audio-only=${this.audioOnly}
        .token=${this.token}
        .host=${this.host}
        .destination=${this.destination}
      >
        <sw-ui-background slot="background" default></sw-ui-background>
        <button class="call-button" part="button">
          <sw-ui-icon name="phone-call" size="20"></sw-ui-icon>
          ${this.label}
        </button>
      </sw-call-widget>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-click-to-call': SwClickToCall;
  }
}
