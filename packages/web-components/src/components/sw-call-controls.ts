import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { Subscription } from 'rxjs';
import { devicesContext, type DevicesState } from '../context/devices-context.js';
import { callStateContext, type CallState } from '../context/call-state-context.js';
import type { DropUpItem } from './UI/controls/sw-ui-dropup.js';
import type {
  FullscreenToggleDetail,
  ScreenShareToggleDetail,
  HandRaiseToggleDetail,
  SettingsChangeDetail,
} from './UI/controls/sw-ui-control-bar.js';
import { getLogger } from '@signalwire/js';
import type { CallSelfParticipant } from '@signalwire/js';
import type { Call } from '../types/index.js';

const logger = getLogger();

/**
 * Connected control bar that bridges `devicesContext` and `callStateContext`
 * to the pure `sw-ui-control-bar` UI component.
 *
 * Input precedence (most specific wins): `.call` > context.
 * When `.call` is set, the control bar drives screen-share / hand-raise /
 * hang-up directly from the Call. Mic/camera/speaker toggles still require
 * `devicesContext` — without it those buttons render in their default state.
 *
 * @prop {Call}    call             - explicit Call object (overrides context)
 * @prop {boolean} showScreenShare  - show the screen-share button
 * @prop {boolean} showHandRaise   - show the hand-raise button
 * @prop {boolean} showTranscript  - show the transcript toggle button
 * @prop {boolean} transcriptActive - current transcript panel visibility
 *
 * @fires sw-call-hangup - Re-dispatched when the user clicks hang-up so external
 *                         consumers (e.g. React parents) can react. No detail.
 */
@customElement('sw-call-controls')
export class SwCallControls extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
  `;

  @consume({ context: devicesContext, subscribe: true })
  @state()
  private _devices!: DevicesState;

  @consume({ context: callStateContext, subscribe: true })
  @state()
  private _callState?: CallState;

  /** Explicit Call — when set, drives call-state actions directly. */
  @property({ type: Object }) call?: Call;

  @state() private _directSelf: CallSelfParticipant | null = null;

  private _directSubscriptions: Subscription[] = [];

  @state() private _fullscreen = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-screen-share' })
  showScreenShare = true;

  @property({ type: Boolean, reflect: true, attribute: 'show-hand-raise' })
  showHandRaise = true;

  @property({ type: Boolean, reflect: true, attribute: 'show-transcript' })
  showTranscript = false;

  @property({ type: Boolean, reflect: true, attribute: 'transcript-active' })
  transcriptActive = false;

  @property({ type: Boolean, reflect: true, attribute: 'show-settings' })
  showSettings = true;

  @property({ type: Boolean, reflect: true, attribute: 'show-fullscreen' })
  showFullscreen = true;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('call')) {
      this._teardownDirect();
      if (this.call) {
        this._directSubscriptions.push(
          this.call.self$.subscribe((s) => (this._directSelf = s))
        );
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownDirect();
  }

  private _teardownDirect(): void {
    this._directSubscriptions.forEach((s) => s.unsubscribe());
    this._directSubscriptions = [];
    this._directSelf = null;
  }

  private get _effectiveSelf(): CallSelfParticipant | null {
    return this.call ? this._directSelf : this._callState?.self ?? null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _toDropupOptions(
    devices: MediaDeviceInfo[],
    selected: MediaDeviceInfo | null
  ): DropUpItem[] {
    // Before getUserMedia permission, browsers may return devices with
    // empty deviceId/label. Deduplicate empty-ID entries into one
    // placeholder so the chevron doesn't show multiple blank rows.
    const seen = new Set<string>();
    const result: DropUpItem[] = [];
    for (const d of devices) {
      const id = d.deviceId || `__default_${d.kind}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({
        id,
        label: d.label || (d.deviceId ? d.deviceId.slice(0, 12) : 'Default'),
        selected: d.deviceId === selected?.deviceId,
      });
    }
    return result;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private _onMicToggle() {
    this._devices?.toggleAudioMute();
  }

  private _onCameraToggle() {
    this._devices?.toggleVideoMute();
  }

  private _onSpeakerToggle() {
    this._devices?.toggleSpeakerMute();
  }

  private _onFullscreenToggle(e: CustomEvent<FullscreenToggleDetail>) {
    this._fullscreen = e.detail.fullscreen;
  }

  private _onScreenShareToggle(e: CustomEvent<ScreenShareToggleDetail>) {
    const self = this._effectiveSelf;
    if (!self) return;

    if (e.detail.active) {
      self.startScreenShare().catch((err) => {
        logger.error('[CallControls] Screen share failed:', err);
      });
    } else {
      self.stopScreenShare().catch((err) => {
        logger.error('[CallControls] Stop screen share failed:', err);
      });
    }
  }

  private _onHandRaiseToggle(_e: CustomEvent<HandRaiseToggleDetail>) {
    const self = this._effectiveSelf;
    if (!self) return;

    self.toggleHandraise().catch((err) => {
      logger.error('[CallControls] Hand raise failed:', err);
    });
  }

  private _onHangUp() {
    const hangup = this.call ? () => this.call!.hangup() : this._callState?.hangup;
    hangup?.().catch((err) => {
      logger.error('[CallControls] Hangup failed:', err);
    });
    // Re-dispatch as sw-call-hangup so external consumers (e.g. React) can react.
    this.dispatchEvent(new CustomEvent('sw-call-hangup', { bubbles: true, composed: true }));
  }

  private _onDeviceChange(e: CustomEvent<{ kind: 'mic' | 'camera' | 'speaker'; deviceId: string }>) {
    if (!this._devices) return;
    const { kind, deviceId } = e.detail;
    const find = (list: MediaDeviceInfo[]) => list.find((d) => d.deviceId === deviceId) ?? null;

    if (kind === 'mic')     this._devices.selectAudioInput(find(this._devices.audioInputDevices));
    if (kind === 'camera')  this._devices.selectVideoInput(find(this._devices.videoInputDevices));
    if (kind === 'speaker') this._devices.selectAudioOutput(find(this._devices.audioOutputDevices));
  }

  private _onSettingsChange(e: CustomEvent<SettingsChangeDetail>) {
    if (!this._devices) return;
    const { settingId } = e.detail;
    const toggles: Record<string, () => Promise<void>> = {
      'echo-cancellation': () => this._devices.toggleEchoCancellation(),
      'auto-gain': () => this._devices.toggleAutoGain(),
      'noise-suppression': () => this._devices.toggleNoiseSuppression(),
    };
    const toggle = toggles[settingId];
    if (toggle) {
      toggle().catch((err) => logger.error('[CallControls] Settings toggle failed:', err));
    }
  }

  private _buildSettingsItems(): DropUpItem[] {
    return [
      { id: 'echo-cancellation', label: 'Echo Cancellation', selected: this._devices.echoCancellation },
      { id: 'auto-gain', label: 'Auto Gain', selected: this._devices.autoGain },
      { id: 'noise-suppression', label: 'Noise Suppression', selected: this._devices.noiseSuppression },
    ];
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    if (!this._devices && !this.call) return html``;

    const self = this._effectiveSelf;
    const isScreenSharing = self?.screenShareStatus === 'started';
    const isHandRaised = self?.handraised ?? false;

    const d = this._devices;
    return html`
      <sw-ui-control-bar
        exportparts="bar,logo,button,chevron"
        .micMuted=${d?.audioMuted ?? false}
        .cameraMuted=${d?.videoMuted ?? false}
        .speakerMuted=${d?.speakerMuted ?? false}
        .fullscreen=${this._fullscreen}
        .screenSharing=${isScreenSharing}
        .handRaised=${isHandRaised}
        .transcriptActive=${this.transcriptActive}
        .showScreenShare=${this.showScreenShare}
        .showHandRaise=${this.showHandRaise}
        .showTranscript=${this.showTranscript}
        .showSettings=${this.showSettings && !!d}
        .showFullscreen=${this.showFullscreen}
        .micDevices=${d ? this._toDropupOptions(d.audioInputDevices, d.selectedAudioInput) : []}
        .cameraDevices=${d ? this._toDropupOptions(d.videoInputDevices, d.selectedVideoInput) : []}
        .speakerDevices=${d ? this._toDropupOptions(d.audioOutputDevices, d.selectedAudioOutput) : []}
        .settingsItems=${d ? this._buildSettingsItems() : []}
        @sw-mic-toggle=${this._onMicToggle}
        @sw-camera-toggle=${this._onCameraToggle}
        @sw-speaker-toggle=${this._onSpeakerToggle}
        @sw-fullscreen-toggle=${this._onFullscreenToggle}
        @sw-screen-share-toggle=${this._onScreenShareToggle}
        @sw-hand-raise-toggle=${this._onHandRaiseToggle}
        @sw-call-hangup=${this._onHangUp}
        @sw-device-change=${this._onDeviceChange}
        @sw-settings-change=${this._onSettingsChange}
      ></sw-ui-control-bar>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-call-controls': SwCallControls;
  }
}
