import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DropUpItem } from './sw-ui-dropup';

// ── Event detail types ────────────────────────────────────────────────────────

export interface MicToggleDetail { muted: boolean }
export interface CameraToggleDetail { muted: boolean }
export interface SpeakerToggleDetail { muted: boolean }
export interface DeviceChangeDetail {
  kind: 'mic' | 'camera' | 'speaker';
  deviceId: string;
  label: string;
}
export interface FullscreenToggleDetail { fullscreen: boolean }
export interface ScreenShareToggleDetail { active: boolean }
export interface HandRaiseToggleDetail { raised: boolean }
export interface SettingsChangeDetail { settingId: string }

// ── Event map ─────────────────────────────────────────────────────────────────

export interface SwUiControlBarEventMap {
  'sw-mic-toggle': CustomEvent<MicToggleDetail>;
  'sw-camera-toggle': CustomEvent<CameraToggleDetail>;
  'sw-speaker-toggle': CustomEvent<SpeakerToggleDetail>;
  'sw-device-change': CustomEvent<DeviceChangeDetail>;
  'sw-fullscreen-toggle': CustomEvent<FullscreenToggleDetail>;
  'sw-screen-share-toggle': CustomEvent<ScreenShareToggleDetail>;
  'sw-hand-raise-toggle': CustomEvent<HandRaiseToggleDetail>;
  'sw-transcript-toggle': CustomEvent<void>;
  'sw-settings-change': CustomEvent<SettingsChangeDetail>;
  'sw-call-hangup': CustomEvent<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Call controls bar.
 *
 * Buttons rendered (left to right): mic, camera, speaker, screen share,
 * hand raise, transcript, fullscreen, hang-up. Optional buttons are hidden
 * when their `show*` property is false.
 *
 * @fires sw-mic-toggle          - Mic toggled. Detail: `{ muted: boolean }`.
 * @fires sw-camera-toggle       - Camera toggled. Detail: `{ muted: boolean }`.
 * @fires sw-speaker-toggle      - Speaker toggled. Detail: `{ muted: boolean }`.
 * @fires sw-device-change       - Device picked from a chevron menu. Detail: `{ kind, deviceId, label }`.
 * @fires sw-fullscreen-toggle   - Fullscreen toggled. Detail: `{ fullscreen: boolean }`.
 * @fires sw-screen-share-toggle - Screen share toggled. Detail: `{ active: boolean }`.
 * @fires sw-hand-raise-toggle   - Hand raise toggled. Detail: `{ raised: boolean }`.
 * @fires sw-transcript-toggle   - Transcript button clicked. No detail.
 * @fires sw-settings-change     - Settings menu item picked. Detail: `{ settingId: string }`.
 * @fires sw-call-hangup         - Hang-up button clicked. No detail.
 *
 * @cssprop --sw-control-bar-bg       [transparent]             - bar background
 * @cssprop --sw-control-bar-padding  [8px 16px]                - bar padding
 * @cssprop --sw-control-bar-gap      [8px]                     - gap between buttons
 * @cssprop --sw-control-bar-radius   [0]                       - bar border-radius
 *
 * @cssprop --sw-split-button-size     [44px]                    - button width & height
 * @cssprop --sw-split-button-bg       [rgba(255,255,255,0.12)]  - button background
 * @cssprop --sw-split-button-bg-hover [rgba(255,255,255,0.22)]  - button hover bg
 * @cssprop --sw-split-button-color    [#fff]                    - icon colour
 * @cssprop --sw-split-button-radius   [9999px]                  - button border-radius
 *
 * @cssprop --sw-control-bar-hangup-bg       - hang-up background       (falls back to --interactive-button-destructive-bg)
 * @cssprop --sw-control-bar-hangup-bg-hover - hang-up hover bg          (falls back to --interactive-button-destructive-hover)
 * @cssprop --sw-control-bar-hangup-color    - hang-up icon colour       (defaults to #fff)
 *
 * The active-toggle variant uses --interactive-button-primary-{bg,hover,text} from the design tokens.
 */
@customElement('sw-ui-control-bar')
export class SwUiControlBar extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--sw-control-bar-bg, transparent);
      border-radius: var(--sw-control-bar-radius, 0);
      container-type: inline-size;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sw-control-bar-gap, 8px);
      padding: var(--sw-control-bar-padding, 8px 16px);
    }

    .sw-logo {
      display: inline-flex;
      align-items: center;
      color: var(--fg-default);
      opacity: 0.5;
      flex-shrink: 0;
      pointer-events: none;
      margin-right: auto;
    }

    .bar-spacer {
      margin-left: auto;
      width: 20px;
      flex-shrink: 0;
    }

    .hangup {
      --sw-split-button-bg: var(--sw-control-bar-hangup-bg, var(--interactive-button-destructive-bg));
      --sw-split-button-bg-hover: var(--sw-control-bar-hangup-bg-hover, var(--interactive-button-destructive-hover));
      --sw-split-button-color: var(--sw-control-bar-hangup-color, #fff);
    }

    .active-toggle {
      --sw-split-button-bg: var(--interactive-button-primary-bg);
      --sw-split-button-bg-hover: var(--interactive-button-primary-hover);
      --sw-split-button-color: var(--interactive-button-primary-text);
    }

    /* Overflow menu hidden by default (wide containers) */
    sw-ui-split-button.overflow { display: none; }

    /* Collapse optional/secondary buttons into an overflow menu on narrow containers */
    @container (max-width: 720px) {
      sw-ui-split-button.optional { display: none !important; }
      sw-ui-split-button.overflow { display: inline-flex; }
    }

    /* Shrink buttons on very narrow containers */
    @container (max-width: 540px) {
      .bar {
        --sw-split-button-size: 34px;
        --sw-split-button-width: 42px;
        --sw-split-button-height: 28px;
        gap: 4px;
        padding: 4px 8px;
      }
      .sw-logo, .bar-spacer { display: none; }
    }

    /* Further shrink for very small phones to prevent clipping */
    @container (max-width: 360px) {
      .bar {
        --sw-split-button-size: 28px;
        --sw-split-button-width: 34px;
        --sw-split-button-height: 24px;
        gap: 2px;
        padding: 2px 4px;
      }
    }
  `;

  // ── Media toggle state ─────────────────────────────────────────────

  @property({ type: Boolean, reflect: true, attribute: 'mic-muted' })
  micMuted = false;

  @property({ type: Boolean, reflect: true, attribute: 'camera-muted' })
  cameraMuted = false;

  @property({ type: Boolean, reflect: true, attribute: 'speaker-muted' })
  speakerMuted = false;

  @property({ type: Boolean, reflect: true })
  fullscreen = false;

  @property({ type: Boolean, reflect: true, attribute: 'screen-sharing' })
  screenSharing = false;

  @property({ type: Boolean, reflect: true, attribute: 'hand-raised' })
  handRaised = false;

  @property({ type: Boolean, reflect: true, attribute: 'transcript-active' })
  transcriptActive = false;

  // ── Visibility flags ───────────────────────────────────────────────

  @property({ type: Boolean, reflect: true, attribute: 'show-screen-share' })
  showScreenShare = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-hand-raise' })
  showHandRaise = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-transcript' })
  showTranscript = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-settings' })
  showSettings = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-fullscreen' })
  showFullscreen = true;

  // ── Device lists ───────────────────────────────────────────────────

  @property({ attribute: false })
  micDevices: DropUpItem[] = [];

  @property({ attribute: false })
  cameraDevices: DropUpItem[] = [];

  @property({ attribute: false })
  speakerDevices: DropUpItem[] = [];

  @property({ attribute: false })
  settingsItems: DropUpItem[] = [];

  // ── Dispatchers ───────────────────────────────────────────────────────────

  private _dispatch<K extends keyof SwUiControlBarEventMap>(
    type: K,
    detail: SwUiControlBarEventMap[K] extends CustomEvent<infer D> ? D : never
  ) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _onMicToggle() {
    this.micMuted = !this.micMuted;
    this._dispatch('sw-mic-toggle', { muted: this.micMuted });
  }

  private _onCameraToggle() {
    this.cameraMuted = !this.cameraMuted;
    this._dispatch('sw-camera-toggle', { muted: this.cameraMuted });
  }

  private _onSpeakerToggle() {
    this.speakerMuted = !this.speakerMuted;
    this._dispatch('sw-speaker-toggle', { muted: this.speakerMuted });
  }

  private _onDeviceSelect(kind: 'mic' | 'camera' | 'speaker', item: DropUpItem) {
    this._dispatch('sw-device-change', { kind, deviceId: item.id, label: item.label });
  }

  private _onFullscreenToggle() {
    this.fullscreen = !this.fullscreen;
    this._dispatch('sw-fullscreen-toggle', { fullscreen: this.fullscreen });
  }

  private _onScreenShareToggle() {
    this.screenSharing = !this.screenSharing;
    this._dispatch('sw-screen-share-toggle', { active: this.screenSharing });
  }

  private _onHandRaiseToggle() {
    this.handRaised = !this.handRaised;
    this._dispatch('sw-hand-raise-toggle', { raised: this.handRaised });
  }

  private _onTranscriptToggle() {
    this.transcriptActive = !this.transcriptActive;
    this._dispatch('sw-transcript-toggle', undefined as never);
  }

  private _onSettingsSelect(e: CustomEvent<DropUpItem>) {
    this._dispatch('sw-settings-change', { settingId: e.detail.id });
  }

  private _onHangUp() {
    this._dispatch('sw-call-hangup', undefined as never);
  }

  private _overflowItems(): DropUpItem[] {
    const items: DropUpItem[] = [];
    if (this.showScreenShare) {
      items.push({
        id: '__overflow:screen-share',
        label: this.screenSharing ? 'Stop sharing' : 'Share screen',
        selected: this.screenSharing,
      });
    }
    if (this.showHandRaise) {
      items.push({
        id: '__overflow:hand-raise',
        label: this.handRaised ? 'Lower hand' : 'Raise hand',
        selected: this.handRaised,
      });
    }
    if (this.showTranscript) {
      items.push({
        id: '__overflow:transcript',
        label: 'Transcript',
        selected: this.transcriptActive,
      });
    }
    if (this.showSettings) {
      items.push(...this.settingsItems);
    }
    if (this.showFullscreen) {
      items.push({
        id: '__overflow:fullscreen',
        label: this.fullscreen ? 'Exit fullscreen' : 'Fullscreen',
        selected: this.fullscreen,
      });
    }
    return items;
  }

  private _onOverflowSelect(e: CustomEvent<DropUpItem>) {
    switch (e.detail.id) {
      case '__overflow:screen-share':
        this._onScreenShareToggle();
        return;
      case '__overflow:hand-raise':
        this._onHandRaiseToggle();
        return;
      case '__overflow:transcript':
        this._onTranscriptToggle();
        return;
      case '__overflow:fullscreen':
        this._onFullscreenToggle();
        return;
      default:
        this._dispatch('sw-settings-change', { settingId: e.detail.id });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="bar" part="bar">
        <!-- SignalWire logo -->
        <span class="sw-logo" part="logo" aria-hidden="true">
          <sw-ui-icon name="sw-logo" size="20"></sw-ui-icon>
        </span>

        <!-- Mic -->
        <sw-ui-split-button
          .active=${!this.micMuted}
          .items=${this.micDevices}
          @sw-split-button-toggle=${this._onMicToggle}
          @sw-dropup-select=${(e: CustomEvent<DropUpItem>) => this._onDeviceSelect('mic', e.detail)}
        >
          <sw-ui-icon slot="active" name="mic-on"></sw-ui-icon>
          <sw-ui-icon slot="inactive" name="mic-off"></sw-ui-icon>
        </sw-ui-split-button>

        <!-- Camera -->
        <sw-ui-split-button
          .active=${!this.cameraMuted}
          .items=${this.cameraDevices}
          @sw-split-button-toggle=${this._onCameraToggle}
          @sw-dropup-select=${(e: CustomEvent<DropUpItem>) => this._onDeviceSelect('camera', e.detail)}
        >
          <sw-ui-icon slot="active" name="camera-on"></sw-ui-icon>
          <sw-ui-icon slot="inactive" name="camera-off"></sw-ui-icon>
        </sw-ui-split-button>

        <!-- Speaker -->
        <sw-ui-split-button
          .active=${!this.speakerMuted}
          .items=${this.speakerDevices}
          @sw-split-button-toggle=${this._onSpeakerToggle}
          @sw-dropup-select=${(e: CustomEvent<DropUpItem>) => this._onDeviceSelect('speaker', e.detail)}
        >
          <sw-ui-icon slot="active" name="speaker-on"></sw-ui-icon>
          <sw-ui-icon slot="inactive" name="speaker-off"></sw-ui-icon>
        </sw-ui-split-button>

        <!-- Screen share (optional) -->
        ${this.showScreenShare
          ? html`
              <sw-ui-split-button
                class="optional ${this.screenSharing ? 'active-toggle' : ''}"
                @sw-split-button-click=${this._onScreenShareToggle}
              >
                <sw-ui-icon name=${this.screenSharing ? 'screen-share-off' : 'screen-share'}></sw-ui-icon>
              </sw-ui-split-button>
            `
          : nothing}

        <!-- Hand raise (optional) -->
        ${this.showHandRaise
          ? html`
              <sw-ui-split-button
                class="optional ${this.handRaised ? 'active-toggle' : ''}"
                @sw-split-button-click=${this._onHandRaiseToggle}
              >
                <sw-ui-icon name="hand-raise"></sw-ui-icon>
              </sw-ui-split-button>
            `
          : nothing}

        <!-- Transcript (optional) -->
        ${this.showTranscript
          ? html`
              <sw-ui-split-button
                class="optional ${this.transcriptActive ? 'active-toggle' : ''}"
                @sw-split-button-click=${this._onTranscriptToggle}
              >
                <sw-ui-icon name="transcript"></sw-ui-icon>
              </sw-ui-split-button>
            `
          : nothing}

        <!-- Settings (optional) -->
        ${this.showSettings
          ? html`
              <sw-ui-split-button
                class="optional"
                .items=${this.settingsItems}
                @sw-dropup-select=${this._onSettingsSelect}
              >
                <sw-ui-icon name="settings"></sw-ui-icon>
              </sw-ui-split-button>
            `
          : nothing}

        <!-- Fullscreen (optional) -->
        ${this.showFullscreen
          ? html`
              <sw-ui-split-button class="optional" @sw-split-button-click=${this._onFullscreenToggle}>
                <sw-ui-icon name=${this.fullscreen ? 'fullscreen-exit' : 'fullscreen'}></sw-ui-icon>
              </sw-ui-split-button>
            `
          : nothing}

        <!-- Overflow menu (shown on narrow containers) -->
        <sw-ui-split-button
          class="overflow"
          .items=${this._overflowItems()}
          @sw-dropup-select=${this._onOverflowSelect}
        >
          <sw-ui-icon name="settings"></sw-ui-icon>
        </sw-ui-split-button>

        <!-- Hang up -->
        <sw-ui-split-button class="hangup" @sw-split-button-click=${this._onHangUp}>
          <sw-ui-icon name="phone-end"></sw-ui-icon>
        </sw-ui-split-button>

        <!-- Spacer to balance the logo and keep buttons centered -->
        <span class="bar-spacer" aria-hidden="true"></span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-ui-control-bar': SwUiControlBar;
  }
}
