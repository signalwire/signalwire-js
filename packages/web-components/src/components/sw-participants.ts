/**
 * SwParticipants Component
 *
 * Renders member overlays based on layoutLayers.
 * Excludes self member and provides slot for <self-media> child component.
 *
 * Input precedence (most specific wins): `.call` > context.
 *
 * @example
 * ```html
 * <sw-participants></sw-participants>
 * <sw-participants .call=${call}></sw-participants>
 * ```
 *
 * @slot - Default slot for overlay content.
 * @slot controls-{memberId} - Per-participant menu content (e.g. `sw-participant-controls`).
 *
 * @fires sw-participant-mute-audio - User muted/unmuted a participant's audio. Detail: `{ participant, memberId }`.
 * @fires sw-participant-mute-video - User muted/unmuted a participant's video. Detail: `{ participant, memberId }`.
 * @fires sw-participant-remove     - User removed a participant. Detail: `{ participant, memberId }`.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import type { CallParticipant, CallSelfParticipant } from '@signalwire/js';
import type { Call, LayoutLayer } from '../types/index.js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import { hostReset } from './UI/host-reset.js';

@customElement('sw-participants')
export class SwParticipants extends LitElement {
  static styles = [hostReset, css`
    :host {
      display: contents;
    }

    .member-overlay {
      box-sizing: border-box;
      box-shadow: inset 0 0 0 8px rgba(255, 0, 0, 0.8);
      background-color: rgba(255, 0, 0, 0.1);
    }

    .member-overlay.is-self {
      box-shadow: inset 0 0 0 8px rgba(0, 0, 255, 0.8);
      background-color: rgba(0, 0, 255, 0.1);
    }

    .menu-trigger {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background 0.2s ease,
        transform 0.2s ease,
        border-color 0.2s ease;
      z-index: 20;
    }

    .menu-trigger:hover {
      background: rgba(0, 0, 0, 0.8);
      border-color: rgba(255, 255, 255, 0.6);
      transform: scale(1.1);
    }

    .menu-trigger:focus {
      outline: none;
      border-color: #044cf6;
      box-shadow: 0 0 0 3px rgba(4, 78, 246, 0.4);
    }

    .menu-trigger svg {
      width: 20px;
      height: 20px;
    }

    .menu-dropdown {
      position: absolute;
      top: 12px;
      left: 56px;
      background: rgba(31, 41, 55, 0.95);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 8px 0;
      min-width: 160px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 30;
      opacity: 0;
      visibility: hidden;
      transform: translateX(-10px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease,
        visibility 0.2s ease;
    }

    .menu-dropdown.open {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      color: white;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: pointer;
      transition: background 0.15s ease;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .menu-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .menu-item.danger {
      color: #ef4444;
    }

    .menu-item.danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  `];

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  /** Explicit Call — when set, subscribes directly and bypasses context. */
  @property({ type: Object }) call?: Call;

  @state() private _directLayoutLayers: LayoutLayer[] = [];
  @state() private _directParticipants: CallParticipant[] = [];
  @state() private _directSelf: CallSelfParticipant | null = null;

  private _directSubscriptions: Subscription[] = [];

  @state()
  private _openMenuId: string | null = null;

  private _handleOutsideClick = (e: Event): void => {
    const target = e.target as Element;
    if (!target.closest('.menu-trigger') && !target.closest('.menu-dropdown')) {
      this._openMenuId = null;
    }
  };

  private _handleEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._openMenuId !== null) {
      this._openMenuId = null;
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._handleOutsideClick);
    document.addEventListener('keydown', this._handleEscape);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
    document.removeEventListener('keydown', this._handleEscape);
    this._teardownDirect();
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('call')) {
      this._teardownDirect();
      if (this.call) {
        this._directSubscriptions.push(
          this.call.layoutLayers$.subscribe((l) => (this._directLayoutLayers = l)),
          this.call.participants$.subscribe((p) => (this._directParticipants = p)),
          this.call.self$.subscribe((s) => (this._directSelf = s))
        );
      }
    }
  }

  private _teardownDirect(): void {
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
    this._directLayoutLayers = [];
    this._directParticipants = [];
    this._directSelf = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private _toggleMenu(memberId: string, e: Event): void {
    e.stopPropagation();
    this._openMenuId = this._openMenuId === memberId ? null : memberId;
  }

  private _getParticipant(memberId: string) {
    const participants = this.call ? this._directParticipants : this._callState?.participants ?? [];
    return participants.find((p) => p.id === memberId);
  }

  private async _handleMuteAudio(memberId: string, e: Event): Promise<void> {
    e.stopPropagation();
    const participant = this._getParticipant(memberId);
    if (!participant) return;
    try {
      if (participant.audioMuted) {
        await participant.unmute();
      } else {
        await participant.mute();
      }
      this.dispatchEvent(
        new CustomEvent('sw-participant-mute-audio', {
          detail: { participant, memberId },
          bubbles: true,
          composed: true,
        })
      );
    } catch {
      // Silently handle error
    }
    this._openMenuId = null;
  }

  private async _handleMuteVideo(memberId: string, e: Event): Promise<void> {
    e.stopPropagation();
    const participant = this._getParticipant(memberId);
    if (!participant) return;
    try {
      if (participant.videoMuted) {
        await participant.unmuteVideo();
      } else {
        await participant.muteVideo();
      }
      this.dispatchEvent(
        new CustomEvent('sw-participant-mute-video', {
          detail: { participant, memberId },
          bubbles: true,
          composed: true,
        })
      );
    } catch {
      // Silently handle error
    }
    this._openMenuId = null;
  }

  private async _handleRemove(memberId: string, e: Event): Promise<void> {
    e.stopPropagation();
    const participant = this._getParticipant(memberId);
    if (!participant?.remove) return;
    try {
      await participant.remove();
      this.dispatchEvent(
        new CustomEvent('sw-participant-remove', {
          detail: { participant, memberId },
          bubbles: true,
          composed: true,
        })
      );
    } catch {
      // Silently handle error
    }
    this._openMenuId = null;
  }

  // ── Render ─────────────────────────────────────────────────────────

  private _renderMenuIcon() {
    return html`
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="6" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="18" r="2" />
      </svg>
    `;
  }

  private _renderMenuDropdown(memberId: string) {
    const participant = this._getParticipant(memberId);
    const isOpen = this._openMenuId === memberId;

    return html`
      <div
        class="menu-dropdown ${isOpen ? 'open' : ''}"
        role="menu"
        aria-label="Participant actions"
      >
        <button
          class="menu-item"
          role="menuitem"
          @click=${(e: Event) => this._handleMuteAudio(memberId, e)}
          aria-label="${participant?.audioMuted ? 'Unmute audio' : 'Mute audio'}"
        >
          ${participant?.audioMuted ? 'Unmute' : 'Mute'}
        </button>
        <button
          class="menu-item"
          role="menuitem"
          @click=${(e: Event) => this._handleMuteVideo(memberId, e)}
          aria-label="${participant?.videoMuted ? 'Enable video' : 'Disable video'}"
        >
          ${participant?.videoMuted ? 'Enable video' : 'Disable video'}
        </button>
        <button
          class="menu-item danger"
          role="menuitem"
          @click=${(e: Event) => this._handleRemove(memberId, e)}
          aria-label="Remove participant"
        >
          Remove
        </button>
      </div>
    `;
  }

  private _renderOverlay(layer: LayoutLayer, isSelf: boolean) {
    const memberId = layer.member_id!;
    const classes = `member-overlay${isSelf ? ' is-self' : ''}`;

    const style = `
      position: absolute;
      top: ${layer.y}%;
      left: ${layer.x}%;
      width: ${layer.width}%;
      height: ${layer.height}%;
      opacity: ${layer.visible ? 1 : 0};
      overflow: visible;
      transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease, opacity 0.3s ease;
      pointer-events: auto;
      z-index: 10;
    `;

    return html`
      <div class="${classes}" part="overlay" style="${style}">
        ${!isSelf
          ? html`
              <button
                class="menu-trigger"
                part="menu-trigger"
                @click=${(e: Event) => this._toggleMenu(memberId, e)}
                aria-label="Participant menu"
                aria-expanded="${this._openMenuId === memberId}"
                aria-haspopup="menu"
              >
                ${this._renderMenuIcon()}
              </button>
              ${this._renderMenuDropdown(memberId)}
            `
          : null}
        <slot name="controls-${memberId}"></slot>
      </div>
    `;
  }

  render() {
    const layers = this.call ? this._directLayoutLayers : this._callState?.layoutLayers ?? [];
    const selfId = this.call ? this._directSelf?.id : this._callState?.self?.id;

    const overlays = layers
      .filter((layer) => layer.member_id)
      .map((layer) => this._renderOverlay(layer, layer.member_id === selfId));

    return html`
      ${overlays}
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-participants': SwParticipants;
  }
}
