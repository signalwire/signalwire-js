import { ContextProvider } from '@lit/context';
import { type Subscription, switchMap, of } from 'rxjs';
import type { DeviceController, Call } from '../types/index.js';
import { devicesContext } from './devices-context.js';
import type { DevicesState } from './devices-context.js';
import type { ContextHost } from './types.js';

const noop = () => Promise.resolve();

// Frozen so the shared empty-array references can't be mutated by a
// consumer who reads the empty state.
const EMPTY_STATE: DevicesState = Object.freeze({
  audioInputDevices: Object.freeze([]) as unknown as DevicesState['audioInputDevices'],
  audioOutputDevices: Object.freeze([]) as unknown as DevicesState['audioOutputDevices'],
  videoInputDevices: Object.freeze([]) as unknown as DevicesState['videoInputDevices'],
  selectedAudioInput: null,
  selectedAudioOutput: null,
  selectedVideoInput: null,
  audioMuted: false,
  videoMuted: false,
  speakerMuted: false,
  selectAudioInput: () => {},
  selectAudioOutput: () => {},
  selectVideoInput: () => {},
  toggleAudioMute: noop,
  toggleVideoMute: noop,
  toggleSpeakerMute: noop,
  echoCancellation: true,
  autoGain: true,
  noiseSuppression: true,
  toggleEchoCancellation: noop,
  toggleAutoGain: noop,
  toggleNoiseSuppression: noop,
}) as DevicesState;

/**
 * ReactiveController that bridges DeviceController + Call into a clean
 * DevicesState provided via Lit context. Consumers need zero RxJS.
 *
 * Usage in a provider component:
 *
 *   private _devices = new DevicesContextController(this);
 *
 *   // Wire up devices (can be done before a call exists):
 *   this._devices.connectDevices(deviceController);
 *
 *   // Wire up call (mute state, server-driven changes):
 *   this._devices.connectCall(call);
 *
 *   // Tear down individually or all at once:
 *   this._devices.disconnectCall();
 *   this._devices.disconnect();
 */
export class DevicesContextController {
  private _provider: ContextProvider<typeof devicesContext>;
  private _dc: DeviceController | null = null;
  private _deviceSubs: Subscription[] = [];
  private _callSubs: Subscription[] = [];
  private _state: DevicesState = { ...EMPTY_STATE };

  constructor(host: ContextHost) {
    this._provider = new ContextProvider(host, {
      context: devicesContext,
      initialValue: this._state,
    });
    host.addController(this);
  }

  hostConnected() {}
  hostDisconnected() {
    this.disconnect();
  }

  // ── Device controller ───────────────────────────────────────────────────

  connectDevices(dc: DeviceController) {
    this._dc = dc;
    this._deviceSubs.forEach((s) => s.unsubscribe());

    this._patch({
      selectAudioInput: (d) => dc.selectAudioInputDevice(d),
      selectAudioOutput: (d) => dc.selectAudioOutputDevice(d),
      selectVideoInput: (d) => dc.selectVideoInputDevice(d),
    });

    this._deviceSubs = [
      dc.audioInputDevices$.subscribe((devices) =>
        this._patch({ audioInputDevices: devices })
      ),
      dc.audioOutputDevices$.subscribe((devices) =>
        this._patch({ audioOutputDevices: devices })
      ),
      dc.videoInputDevices$.subscribe((devices) =>
        this._patch({ videoInputDevices: devices })
      ),
      dc.selectedAudioInputDevice$.subscribe((device) =>
        this._patch({ selectedAudioInput: device })
      ),
      dc.selectedAudioOutputDevice$.subscribe((device) =>
        this._patch({ selectedAudioOutput: device })
      ),
      dc.selectedVideoInputDevice$.subscribe((device) =>
        this._patch({ selectedVideoInput: device })
      ),
    ];

    dc.enableDeviceMonitoring();
  }

  /** Force device re-enumeration (call after getUserMedia grants permission). */
  refreshDevices(): void {
    if (this._dc) {
      this._dc.enableDeviceMonitoring();
    }
  }

  // ── Call / mute state ───────────────────────────────────────────────────

  connectCall(call: Call) {
    this.disconnectCall();

    // Track the current self participant so actions always call the live instance
    const selfSub = call.self$.subscribe((self) => {
      this._patch({
        toggleAudioMute: self ? () => self.toggleMute() : noop,
        toggleVideoMute: self ? () => self.toggleMuteVideo() : noop,
        toggleSpeakerMute: self ? () => self.toggleDeaf() : noop,
        toggleEchoCancellation: self ? () => self.toggleEchoCancellation() : noop,
        toggleAutoGain: self ? () => self.toggleAudioInputAutoGain() : noop,
        toggleNoiseSuppression: self ? () => self.toggleNoiseSuppression() : noop,
      });
    });

    // switchMap: re-subscribes to the new self's observables whenever self changes.
    // Falls back to `false` while self is null (e.g. before join, after leave).
    const audioMutedSub = call.self$
      .pipe(switchMap((self) => (self ? self.audioMuted$ : of(false))))
      .subscribe((muted) => this._patch({ audioMuted: muted }));

    const videoMutedSub = call.self$
      .pipe(switchMap((self) => (self ? self.videoMuted$ : of(false))))
      .subscribe((muted) => this._patch({ videoMuted: muted }));

    const speakerMutedSub = call.self$
      .pipe(switchMap((self) => (self ? self.deaf$ : of(false))))
      .subscribe((deaf) => this._patch({ speakerMuted: deaf }));

    const echoCancellationSub = call.self$
      .pipe(switchMap((self) => (self ? self.echoCancellation$ : of(true))))
      .subscribe((enabled) => this._patch({ echoCancellation: enabled }));

    const autoGainSub = call.self$
      .pipe(switchMap((self) => (self ? self.autoGain$ : of(true))))
      .subscribe((enabled) => this._patch({ autoGain: enabled }));

    const noiseSuppressionSub = call.self$
      .pipe(switchMap((self) => (self ? self.noiseSuppression$ : of(true))))
      .subscribe((enabled) => this._patch({ noiseSuppression: enabled }));

    this._callSubs = [
      selfSub,
      audioMutedSub, videoMutedSub, speakerMutedSub,
      echoCancellationSub, autoGainSub, noiseSuppressionSub,
    ];
  }

  disconnectCall() {
    this._callSubs.forEach((s) => s.unsubscribe());
    this._callSubs = [];
    this._patch({
      audioMuted: false,
      videoMuted: false,
      speakerMuted: false,
      toggleAudioMute: noop,
      toggleVideoMute: noop,
      toggleSpeakerMute: noop,
      echoCancellation: true,
      autoGain: true,
      noiseSuppression: true,
      toggleEchoCancellation: noop,
      toggleAutoGain: noop,
      toggleNoiseSuppression: noop,
    });
  }

  // ── Full teardown ───────────────────────────────────────────────────────

  disconnect() {
    this._deviceSubs.forEach((s) => s.unsubscribe());
    this._deviceSubs = [];
    this.disconnectCall();
    this._patch({ ...EMPTY_STATE });
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private _patch(partial: Partial<DevicesState>) {
    this._state = { ...this._state, ...partial };
    this._provider.setValue(this._state);
  }
}
