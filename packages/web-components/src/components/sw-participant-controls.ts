/**
 * Per-participant control panel.
 *
 * Takes a `participant-id` and looks up the participant.
 * Shows mute audio, mute video, volume, pin, and remove actions based on
 * the `capabilities` list from the call state.
 *
 * Input precedence (most specific wins): `.call` > context.
 *
 * @prop {string} participantId - ID of the participant to control
 * @prop {Call}    call         - explicit Call object (overrides context)
 * @prop {boolean} showVolume   - show volume slider
 * @prop {boolean} showPin      - show pin/spotlight button
 *
 * @fires sw-participant-volume-change - Volume slider changed. Detail: `{ participantId: string, volume: number }`.
 * @fires sw-participant-pin-toggle    - Pin/unpin clicked. Detail: `{ participantId: string, pinned: boolean }`.
 *
 * Themed via the SignalWire DTCG tokens (`--bg-page`, `--bg-surface`, `--bg-surface-raised`,
 * `--fg-default`, `--border-default`, `--radius-md`, `--shadow-md`, `--type-family-body`,
 * `--type-size-small`, `--interactive-button-destructive-bg`,
 * `--interactive-button-destructive-hover`, `--transition-fast`).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import type { CallParticipant } from '@signalwire/js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { Call } from '../types/index.js';
import { getLogger } from '@signalwire/js';
import './UI/icons/sw-ui-icon.js';
import { hostReset } from './UI/host-reset.js';

const logger = getLogger();

@customElement('sw-participant-controls')
export class SwParticipantControls extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: block;
      font-family: var(--type-family-body);
      font-size: var(--type-size-small);
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      background: var(--bg-page);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      min-width: 180px;
      box-shadow: var(--shadow-md);
      color: var(--fg-default);
    }

    .name {
      font-size: 0.8125rem;
      font-weight: 500;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-default);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    button {
      all: unset;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      font-size: 0.75rem;
      cursor: pointer;
      background: var(--bg-surface);
      color: var(--fg-default);
      transition: background var(--transition-fast);
    }

    button:hover {
      background: var(--bg-surface-raised);
    }

    button.active {
      background: var(--interactive-button-destructive-bg);
      color: #fff;
    }

    button.active:hover {
      background: var(--interactive-button-destructive-hover);
    }

    button.danger {
      color: var(--interactive-button-destructive-bg);
    }

    button.danger:hover {
      background: var(--interactive-button-destructive-bg);
      color: #fff;
    }

    .volume-control {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
    }

    .volume-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      color: color-mix(in srgb, var(--fg-default) 50%, transparent);
    }

    input[type='range'] {
      width: 100%;
      height: 4px;
      appearance: none;
      background: var(--border-default);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }

    input[type='range']::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      background: #3b82f6;
      border-radius: 50%;
      cursor: pointer;
    }

    input[type='range']::-moz-range-thumb {
      width: 12px;
      height: 12px;
      background: #3b82f6;
      border-radius: 50%;
      border: none;
      cursor: pointer;
    }

    .empty {
      font-size: 0.7rem;
      color: color-mix(in srgb, var(--fg-default) 50%, transparent);
      text-align: center;
      padding: 6px;
    }
  `];

  @property({ type: String, attribute: 'participant-id' })
  participantId = '';

  @property({ type: Boolean, reflect: true, attribute: 'show-volume' })
  showVolume = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-pin' })
  showPin = false;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  /** Explicit Call — when set, subscribes directly and bypasses context. */
  @property({ type: Object }) call?: Call;

  @state() private _directParticipants: CallParticipant[] = [];
  @state() private _directCapabilities: string[] = [];

  private _directSubscriptions: Subscription[] = [];

  @state() private _volume = 100;
  @state() private _isPinned = false;

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('call')) {
      this._directSubscriptions.forEach((s) => s.unsubscribe());
      this._directSubscriptions = [];
      this._directParticipants = [];
      this._directCapabilities = [];
      if (this.call) {
        this._directSubscriptions.push(
          this.call.participants$.subscribe((p) => (this._directParticipants = p)),
          this.call.capabilities$.subscribe((c) => (this._directCapabilities = c))
        );
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
  }

  // ── Derived state ──────────────────────────────────────────────────

  private get _participant() {
    const participants = this.call ? this._directParticipants : this._callState?.participants ?? [];
    return participants.find((p) => p.id === this.participantId);
  }

  private get _capabilities(): string[] {
    return this.call ? this._directCapabilities : this._callState?.capabilities ?? [];
  }

  private get _canMuteAudio(): boolean {
    return this._capabilities.includes('memberMuteAudio');
  }

  private get _canMuteVideo(): boolean {
    return this._capabilities.includes('memberMuteVideo');
  }

  private get _canRemove(): boolean {
    return this._capabilities.includes('memberRemove');
  }

  // ── Actions ────────────────────────────────────────────────────────

  private async _toggleAudioMute() {
    const p = this._participant;
    if (!p) return;
    try {
      if (p.audioMuted) {
        await p.unmute();
      } else {
        await p.mute();
      }
    } catch (err) {
      logger.error('[ParticipantControls] Toggle audio failed:', err);
    }
  }

  private async _toggleVideoMute() {
    const p = this._participant;
    if (!p) return;
    try {
      if (p.videoMuted) {
        await p.unmuteVideo();
      } else {
        await p.muteVideo();
      }
    } catch (err) {
      logger.error('[ParticipantControls] Toggle video failed:', err);
    }
  }

  private async _remove() {
    const p = this._participant;
    if (!p?.remove) return;
    try {
      await p.remove();
    } catch (err) {
      logger.error('[ParticipantControls] Remove failed:', err);
    }
  }

  private _onVolumeChange(e: Event) {
    this._volume = parseInt((e.target as HTMLInputElement).value, 10);
    this.dispatchEvent(
      new CustomEvent('sw-participant-volume-change', {
        detail: { participantId: this.participantId, volume: this._volume },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _togglePin() {
    this._isPinned = !this._isPinned;
    this.dispatchEvent(
      new CustomEvent('sw-participant-pin-toggle', {
        detail: { participantId: this.participantId, pinned: this._isPinned },
        bubbles: true,
        composed: true,
      })
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  render() {
    const p = this._participant;
    if (!p) return html`<div class="panel"><div class="empty">Participant not found</div></div>`;

    const hasActions = this._canMuteAudio || this._canMuteVideo || this._canRemove || this.showVolume || this.showPin;

    return html`
      <div class="panel" part="panel">
        <div class="name" part="name">${p.name ?? 'Participant'}</div>

        <div class="actions">
          ${!hasActions ? html`<div class="empty">No actions available</div>` : nothing}

          ${this._canMuteAudio
            ? html`
                <button class=${p.audioMuted ? 'active' : ''} @click=${this._toggleAudioMute}>
                  <sw-ui-icon name=${p.audioMuted ? 'mic-off' : 'mic-on'} size="14"></sw-ui-icon>
                  ${p.audioMuted ? 'Unmute' : 'Mute'}
                </button>
              `
            : nothing}

          ${this._canMuteVideo
            ? html`
                <button class=${p.videoMuted ? 'active' : ''} @click=${this._toggleVideoMute}>
                  <sw-ui-icon name=${p.videoMuted ? 'camera-off' : 'camera-on'} size="14"></sw-ui-icon>
                  ${p.videoMuted ? 'Enable video' : 'Disable video'}
                </button>
              `
            : nothing}

          ${this.showVolume
            ? html`
                <div class="volume-control">
                  <label class="volume-label">
                    <sw-ui-icon name="speaker-on" size="14"></sw-ui-icon>
                    Volume: ${this._volume}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    .value=${String(this._volume)}
                    @input=${this._onVolumeChange}
                  />
                </div>
              `
            : nothing}

          ${this.showPin
            ? html`
                <button class=${this._isPinned ? 'active' : ''} @click=${this._togglePin}>
                  <sw-ui-icon name="settings" size="14"></sw-ui-icon>
                  ${this._isPinned ? 'Unpin' : 'Pin'}
                </button>
              `
            : nothing}

          ${this._canRemove
            ? html`
                <button class="danger" @click=${this._remove}>
                  <sw-ui-icon name="close" size="14"></sw-ui-icon>
                  Remove
                </button>
              `
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-participant-controls': SwParticipantControls;
  }
}
