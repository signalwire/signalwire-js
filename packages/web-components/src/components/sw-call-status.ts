/**
 * Call Status Component
 *
 * Displays current call state with status text and duration timer.
 *
 * Input precedence (most specific wins): `.call` > context.
 *
 * @example
 * ```html
 * <!-- Inside a context provider: -->
 * <sw-call-status></sw-call-status>
 *
 * <!-- Standalone with an explicit Call: -->
 * <sw-call-status .call=${call}></sw-call-status>
 * ```
 *
 * @csspart container   - Outer status container.
 * @csspart status-text - Text label of the current status.
 * @csspart duration    - Elapsed-time label (only rendered when connected).
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import type { CallStatus } from '@signalwire/js';
import type { Call } from '../types/index.js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { hostReset } from './UI/host-reset.js';

@customElement('sw-call-status')
export class SwCallStatus extends LitElement {
  static styles = [hostReset, css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--type-family-body);
        font-size: var(--type-size-small);
      }

      .container {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        color: var(--fg-default);
      }

      .status-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .status-indicator.new {
        background-color: var(--bg-surface-raised);
      }
      .status-indicator.connecting,
      .status-indicator.ringing,
      .status-indicator.trying,
      .status-indicator.recovering {
        background-color: var(--interactive-status-warning);
        animation: pulse 1.5s ease-in-out infinite;
      }
      .status-indicator.connected {
        background-color: var(--interactive-status-success);
      }
      .status-indicator.disconnecting {
        background-color: var(--interactive-button-destructive-bg);
        animation: pulse 1s ease-in-out infinite;
      }
      .status-indicator.disconnected,
      .status-indicator.failed {
        background-color: var(--interactive-button-destructive-bg);
      }
      .status-indicator.destroyed {
        background-color: var(--bg-surface-raised);
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(1.1);
        }
      }

      .status-text {
        font-weight: 500;
        white-space: nowrap;
      }
      .status-text.trying,
      .status-text.connecting,
      .status-text.ringing,
      .status-text.recovering {
        color: var(--interactive-status-warning);
      }
      .status-text.disconnecting {
        color: var(--interactive-button-destructive-bg);
      }
      .status-text.connected {
        color: var(--interactive-status-success);
      }
      .status-text.disconnected,
      .status-text.failed {
        color: var(--interactive-button-destructive-bg);
      }
      .status-text.new,
      .status-text.destroyed {
        color: var(--bg-surface-raised);
      }

      .duration {
        font-variant-numeric: tabular-nums;
        opacity: 0.6;
        font-size: 0.85em;
      }
    `];

  /** Explicit Call — when set, subscribes directly to its observables and bypasses context. */
  @property({ type: Object }) call?: Call;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  /** Status from a directly-subscribed `.call` — `null` when context is the source. */
  @state() private _directStatus: CallStatus | null = null;

  @state() private _callStartTime: number | null = null;
  @state() private _duration = '0:00';

  private _durationInterval: number | null = null;
  private _prevStatus: CallStatus = 'new';
  private _directSubscriptions: Subscription[] = [];

  private get _effectiveStatus(): CallStatus {
    return this.call ? this._directStatus ?? 'new' : this._callState?.status ?? 'new';
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    if (changed.has('call')) {
      this._teardownDirect();
      if (this.call) this._setupDirect(this.call);
    }

    if (changed.has('call') || changed.has('_callState') || changed.has('_directStatus')) {
      const status = this._effectiveStatus;
      if (status !== this._prevStatus) {
        if (status === 'connected' && this._prevStatus !== 'connected') {
          this._startDurationTimer();
        } else if (status !== 'connected') {
          this._stopDurationTimer();
        }
        this._prevStatus = status;
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopDurationTimer();
    this._teardownDirect();
  }

  private _setupDirect(call: Call): void {
    this._directSubscriptions.push(
      call.status$.subscribe((s) => {
        this._directStatus = s;
      })
    );
  }

  private _teardownDirect(): void {
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
    this._directStatus = null;
  }

  private _startDurationTimer(): void {
    this._callStartTime = Date.now();
    this._duration = '0:00';
    this._durationInterval = window.setInterval(() => {
      if (this._callStartTime) {
        const elapsed = Math.floor((Date.now() - this._callStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const secs = elapsed % 60;
        this._duration =
          hours > 0
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            : `${minutes}:${secs.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  private _stopDurationTimer(): void {
    if (this._durationInterval) {
      clearInterval(this._durationInterval);
      this._durationInterval = null;
    }
    this._callStartTime = null;
    this._duration = '0:00';
  }

  private getStatusText(): string {
    const status = this._effectiveStatus;
    switch (status) {
      case 'new':
        return 'Ready';
      case 'trying':
        return 'Trying...';
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return 'Connected';
      case 'recovering':
        return 'Reconnecting...';
      case 'disconnecting':
        return 'Disconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Failed';
      case 'destroyed':
        return 'Ended';
      default: {
        const _exhaustive: never = status;
        return String(_exhaustive);
      }
    }
  }

  render() {
    const status = this._effectiveStatus;
    const statusText = this.getStatusText();

    return html`
      <div class="container" part="container">
        <span class="status-indicator ${status}" aria-hidden="true"></span>
        <span class="status-text ${status}" part="status-text" role="status" aria-live="polite">
          ${statusText}
        </span>
        ${status === 'connected'
          ? html`<span class="duration" part="duration">${this._duration}</span>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-status': SwCallStatus;
  }
}
