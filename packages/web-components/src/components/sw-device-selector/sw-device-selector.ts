import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Subscription } from 'rxjs';
import type { DeviceController } from '@signalwire/js';
import { getLogger } from '@signalwire/js';
import type { IconName } from '../UI/icons/icons.js';
import { deviceSelectorStyles } from './sw-device-selector.styles.js';
import { hostReset } from '../UI/host-reset.js';
import '../UI/icons/sw-ui-icon.js';
import '../sw-local-camera.js';
import '../sw-audio-level.js';

const logger = getLogger();

type AudioElementWithSinkId = HTMLAudioElement & {
  setSinkId?: (sinkId: string) => Promise<void>;
};

/**
 * Single-button device settings popover. Opens a panel above the button
 * with sections for Microphone, Camera, and Speaker selection.
 *
 * When `show-preview` is enabled, the open panel also renders a live
 * camera preview, a microphone level meter for the currently selected
 * input devices, and a "Test speaker" button that plays a short tone
 * through the selected output.
 *
 * @fires sw-device-change - User picked a device. Detail: `{ type: 'microphone'|'camera'|'speaker', device: MediaDeviceInfo }`.
 * @cssprop --ctrl-*  - all primitive ctrl tokens
 */
@customElement('sw-device-selector')
export class SwDeviceSelector extends LitElement {
  static styles = [hostReset, deviceSelectorStyles];

  @property({ type: Object }) deviceController?: DeviceController;

  /**
   * Render inline previews (camera video, mic level, speaker test) inside
   * each section while the panel is open. Streams are acquired only while
   * the panel is open and stopped when it closes.
   */
  @property({ type: Boolean, reflect: true, attribute: 'show-preview' })
  showPreview = false;

  @state() private _videoStream: MediaStream | null = null;
  @state() private _audioStream: MediaStream | null = null;
  @state() private _testingSpeaker = false;

  @state() private _audioIn: MediaDeviceInfo[] = [];
  @state() private _videoIn: MediaDeviceInfo[] = [];
  @state() private _audioOut: MediaDeviceInfo[] = [];
  @state() private _selAudioIn: MediaDeviceInfo | null = null;
  @state() private _selVideoIn: MediaDeviceInfo | null = null;
  @state() private _selAudioOut: MediaDeviceInfo | null = null;
  @state() private _open = false;

  private _subs: Subscription[] = [];

  private _onDocumentClick = (e: MouseEvent) => {
    if (!e.composedPath().includes(this)) this._open = false;
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocumentClick);
    this._subscribe();
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('deviceController')) {
      this._unsubscribe();
      this._subscribe();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocumentClick);
    this._unsubscribe();
    this._stopVideoPreview();
    this._stopAudioPreview();
    this._stopTestTone();
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (!this.showPreview) {
      if (changed.has('showPreview') || changed.has('_open')) {
        this._stopVideoPreview();
        this._stopAudioPreview();
      }
      return;
    }

    const opened = changed.has('_open') && this._open;
    const closed = changed.has('_open') && !this._open;
    const cameraChanged = changed.has('_selVideoIn');
    const micChanged = changed.has('_selAudioIn');

    if (closed) {
      this._stopVideoPreview();
      this._stopAudioPreview();
      this._stopTestTone();
      return;
    }

    if (this._open && (opened || cameraChanged) && this._selVideoIn) {
      this._startVideoPreview(this._selVideoIn.deviceId);
    }
    if (this._open && (opened || micChanged) && this._selAudioIn) {
      this._startAudioPreview(this._selAudioIn.deviceId);
    }
  }

  // ── subscriptions ──────────────────────────────────────────────────

  private _subscribe(): void {
    const dc = this.deviceController;
    if (!dc) return;

    this._subs.push(dc.audioInputDevices$.subscribe((d) => { this._audioIn = d; }));
    this._subs.push(dc.videoInputDevices$.subscribe((d) => { this._videoIn = d; }));
    this._subs.push(dc.audioOutputDevices$.subscribe((d) => { this._audioOut = d; }));

    if (dc.selectedAudioInputDevice$)
      this._subs.push(dc.selectedAudioInputDevice$.subscribe((d) => { this._selAudioIn = d; }));
    if (dc.selectedVideoInputDevice$)
      this._subs.push(dc.selectedVideoInputDevice$.subscribe((d) => { this._selVideoIn = d; }));
    if (dc.selectedAudioOutputDevice$)
      this._subs.push(dc.selectedAudioOutputDevice$.subscribe((d) => { this._selAudioOut = d; }));
  }

  private _unsubscribe(): void {
    this._subs.forEach((s) => s.unsubscribe());
    this._subs = [];
  }

  // ── handlers ──────────────────────────────────────────────────────

  private _toggle(e: Event) {
    e.stopPropagation();
    this._open = !this._open;
  }

  private _selectMic(deviceId: string) {
    const device = this._audioIn.find((d) => d.deviceId === deviceId) ?? null;
    this._selAudioIn = device;
    this.deviceController?.selectAudioInputDevice?.(device);
    if (device) this._emitChange('microphone', device);
  }

  private _selectCamera(deviceId: string) {
    const device = this._videoIn.find((d) => d.deviceId === deviceId) ?? null;
    this._selVideoIn = device;
    this.deviceController?.selectVideoInputDevice?.(device);
    if (device) this._emitChange('camera', device);
  }

  private _selectSpeaker(deviceId: string) {
    const device = this._audioOut.find((d) => d.deviceId === deviceId) ?? null;
    this._selAudioOut = device;
    this.deviceController?.selectAudioOutputDevice?.(device);
    if (device) this._emitChange('speaker', device);
  }

  // ── preview streams ───────────────────────────────────────────────

  private async _startVideoPreview(deviceId: string): Promise<void> {
    this._stopVideoPreview();
    try {
      this._videoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
    } catch (error) {
      logger.error('sw-device-selector: failed to start camera preview', error);
      this._videoStream = null;
    }
  }

  private _stopVideoPreview(): void {
    this._videoStream?.getTracks().forEach((t) => t.stop());
    this._videoStream = null;
  }

  private async _startAudioPreview(deviceId: string): Promise<void> {
    this._stopAudioPreview();
    try {
      this._audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });
    } catch (error) {
      logger.error('sw-device-selector: failed to start microphone preview', error);
      this._audioStream = null;
    }
  }

  private _stopAudioPreview(): void {
    this._audioStream?.getTracks().forEach((t) => t.stop());
    this._audioStream = null;
  }

  // ── speaker test ──────────────────────────────────────────────────

  private static readonly _TEST_TONE_DATA_URI =
    'data:audio/wav;base64,UklGRrQEAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZAEAACAh46Sl5qcm5mWko2HgXp1cGxqaWlsb3R5gIaNk5icnp2bl5OOiIJ8dnFtamhoam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamloam1xdnyChI+VmZ2enZqXkoyGgHt1cG1qaGhrbnJ4foSLkZianp6cmZWQioR+eHJuamlo';

  private _testAudio?: AudioElementWithSinkId;

  private async _testSpeaker(): Promise<void> {
    if (this._testingSpeaker) {
      this._stopTestTone();
      return;
    }
    const audio = new Audio(SwDeviceSelector._TEST_TONE_DATA_URI) as AudioElementWithSinkId;
    audio.loop = true;
    this._testAudio = audio;

    const sinkId = this._selAudioOut?.deviceId;
    if (sinkId && typeof audio.setSinkId === 'function') {
      try {
        await audio.setSinkId(sinkId);
      } catch (error) {
        logger.error('sw-device-selector: setSinkId failed', error);
      }
    }
    audio.addEventListener('ended', () => this._stopTestTone());
    try {
      await audio.play();
      this._testingSpeaker = true;
    } catch (error) {
      logger.error('sw-device-selector: failed to play test tone', error);
      this._stopTestTone();
    }
  }

  private _stopTestTone(): void {
    if (this._testAudio) {
      this._testAudio.pause();
      this._testAudio.src = '';
      this._testAudio = undefined;
    }
    this._testingSpeaker = false;
  }

  private _emitChange(type: 'microphone' | 'camera' | 'speaker', device: MediaDeviceInfo) {
    this.dispatchEvent(new CustomEvent('sw-device-change', {
      detail: { type, device },
      bubbles: true,
      composed: true
    }));
  }

  // ── render helpers ────────────────────────────────────────────────

  private _renderSection(
    iconName: IconName,
    title: string,
    devices: MediaDeviceInfo[],
    selectedId: string | undefined,
    onSelect: (id: string) => void,
    preview?: unknown
  ) {
    return html`
      <div class="section">
        <div class="section-header">
          <sw-ui-icon name=${iconName} size="13"></sw-ui-icon>
          <span>${title}</span>
        </div>
        ${devices.length === 0
          ? html`<div class="no-devices">No devices found</div>`
          : devices.map((d, i) => html`
              <div
                class="device-item ${d.deviceId === selectedId ? 'selected' : ''}"
                role="option"
                aria-selected=${d.deviceId === selectedId}
                @click=${() => onSelect(d.deviceId)}
              >
                <svg class="check" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6.5 12L2 7.5l1.4-1.4 3.1 3.1 5.6-5.6 1.4 1.4z" />
                </svg>
                <span class="device-label">${d.label || `Device ${i + 1}`}</span>
              </div>
            `)
        }
        ${preview ?? nothing}
      </div>
    `;
  }

  private _renderCameraPreview() {
    if (!this.showPreview) return null;
    return html`
      <div class="preview preview-camera" part="preview-camera">
        ${this._videoStream
          ? html`<sw-local-camera .stream=${this._videoStream} mirror></sw-local-camera>`
          : html`<div class="preview-empty">Starting camera…</div>`}
      </div>
    `;
  }

  private _renderMicPreview() {
    if (!this.showPreview) return null;
    return html`
      <div class="preview preview-mic" part="preview-mic">
        ${this._audioStream
          ? html`<sw-audio-level
              .stream=${this._audioStream}
              bars="9"
              orientation="horizontal"
              maxSize="22"
            ></sw-audio-level>`
          : html`<div class="preview-empty">Starting microphone…</div>`}
      </div>
    `;
  }

  private _renderSpeakerPreview() {
    if (!this.showPreview) return null;
    return html`
      <div class="preview preview-speaker" part="preview-speaker">
        <button
          class="test-speaker"
          part="test-speaker-button"
          ?disabled=${!this._selAudioOut}
          @click=${(e: Event) => { e.stopPropagation(); this._testSpeaker(); }}
        >
          <sw-ui-icon name=${this._testingSpeaker ? 'speaker-off' : 'speaker-on'} size="14"></sw-ui-icon>
          <span>${this._testingSpeaker ? 'Stop test' : 'Test speaker'}</span>
        </button>
      </div>
    `;
  }

  // ── render ─────────────────────────────────────────────────────────

  render() {
    const hasDevices = this._audioIn.length > 0 || this._videoIn.length > 0 || this._audioOut.length > 0;

    return html`
      ${this._open ? html`
        <div
          class="panel"
          role="listbox"
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape') this._open = false; }}
        >
          ${this._renderSection('mic-on', 'Microphone', this._audioIn, this._selAudioIn?.deviceId, (id) => this._selectMic(id), this._renderMicPreview())}
          ${this._renderSection('camera-on', 'Camera', this._videoIn, this._selVideoIn?.deviceId, (id) => this._selectCamera(id), this._renderCameraPreview())}
          ${this._renderSection('speaker-on', 'Speaker', this._audioOut, this._selAudioOut?.deviceId, (id) => this._selectSpeaker(id), this._renderSpeakerPreview())}
        </div>
      ` : nothing}

      <button
        class="trigger"
        aria-label="Device settings"
        aria-expanded=${this._open}
        aria-haspopup="listbox"
        ?disabled=${!hasDevices}
        @click=${this._toggle}
        part="button"
      >
        <sw-ui-icon name="settings" size="22"></sw-ui-icon>
      </button>
      <span class="label">Devices</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sw-device-selector': SwDeviceSelector;
  }
}
