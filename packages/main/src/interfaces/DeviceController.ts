import type { DeviceRecoveryEvent } from '../core/types/resilience.types';
import type { Observable } from 'rxjs';

/**
 * Interface for media device management.
 *
 * Provides reactive access to available media devices, device selection,
 * and monitoring for device changes (connect/disconnect).
 */
export interface DeviceController {
  /** Observable list of available audio input (microphone) devices. */
  readonly audioInputDevices$: Observable<MediaDeviceInfo[]>;
  /** Observable list of available audio output (speaker) devices. */
  readonly audioOutputDevices$: Observable<MediaDeviceInfo[]>;
  /** Observable list of available video input (camera) devices. */
  readonly videoInputDevices$: Observable<MediaDeviceInfo[]>;

  /** Observable of the currently selected audio input device, or `null` if none. */
  readonly selectedAudioInputDevice$: Observable<MediaDeviceInfo | null>;
  /** Observable of the currently selected audio output device, or `null` if none. */
  readonly selectedAudioOutputDevice$: Observable<MediaDeviceInfo | null>;
  /** Observable of the currently selected video input device, or `null` if none. */
  readonly selectedVideoInputDevice$: Observable<MediaDeviceInfo | null>;

  /** Currently selected audio input device, or `null` if none. */
  readonly selectedAudioInputDevice: MediaDeviceInfo | null;
  /** Currently selected audio output device, or `null` if none. */
  readonly selectedAudioOutputDevice: MediaDeviceInfo | null;
  /** Currently selected video input device, or `null` if none. */
  readonly selectedVideoInputDevice: MediaDeviceInfo | null;

  /** Current snapshot of available audio input devices. */
  readonly audioInputDevices: MediaDeviceInfo[];
  /** Current snapshot of available audio output devices. */
  readonly audioOutputDevices: MediaDeviceInfo[];
  /** Current snapshot of available video input devices. */
  readonly videoInputDevices: MediaDeviceInfo[];

  /** Media track constraints for the selected audio input device. Returns `false` when disabled. */
  readonly selectedAudioInputDeviceConstraints: MediaTrackConstraints | boolean;
  /** Media track constraints for the selected video input device. Returns `false` when disabled. */
  readonly selectedVideoInputDeviceConstraints: MediaTrackConstraints | boolean;

  /**
   * Converts a {@link MediaDeviceInfo} to track constraints suitable for `getUserMedia`.
   * @param deviceInfo - The device to convert, or `null` for default constraints.
   */
  deviceInfoToConstraints(deviceInfo: MediaDeviceInfo | null): MediaTrackConstraints;
  /**
   * Sets the preferred audio input device for future calls.
   * @param device - The device to select, or `null` to use the system default.
   */
  selectAudioInputDevice(device: MediaDeviceInfo | null): void;
  /**
   * Sets the preferred video input device for future calls.
   * @param device - The device to select, or `null` to use the system default.
   */
  selectVideoInputDevice(device: MediaDeviceInfo | null): void;
  /**
   * Sets the preferred audio output device for future calls.
   * @param device - The device to select, or `null` to use the system default.
   */
  selectAudioOutputDevice(device: MediaDeviceInfo | null): void;
  /** Starts monitoring for media device changes (connect/disconnect). */
  enableDeviceMonitoring(): void;
  /** Stops monitoring for media device changes. */
  disableDeviceMonitoring(): void;
  /**
   * Returns the capabilities of a media device.
   * @param deviceInfo - The device to query.
   * @returns The device capabilities, or `null` if unavailable.
   */
  getDeviceCapabilities(deviceInfo: MediaDeviceInfo): Promise<MediaTrackCapabilities | null>;
  /**
   * Checks whether a device is still available and usable.
   * @param deviceInfo - The device to validate, or `null`.
   * @returns `true` if the device is valid and available. Returns `false` for `null`, audio output devices, or unavailable devices.
   */
  isValidDevice(deviceInfo: MediaDeviceInfo | null): Promise<boolean>;
  /** Observable stream of errors from device enumeration and monitoring. */
  readonly errors$: Observable<Error>;
  /**
   * Observable that emits when the SDK auto-switches a device due to
   * disconnect, reconnect, or recovery.
   */
  readonly deviceRecovered$: Observable<DeviceRecoveryEvent>;

  // Section 5.9: Intentional device disable

  /** Disables audio input (receive-only mode). No track will be acquired. */
  disableAudioInput(): void;
  /** Re-enables audio input, restoring the last selection or auto-selecting. */
  enableAudioInput(): void;
  /** Disables video input (receive-only mode). No track will be acquired. */
  disableVideoInput(): void;
  /** Re-enables video input, restoring the last selection or auto-selecting. */
  enableVideoInput(): void;
  /** Observable that emits `true` when video input is disabled (receive-only). */
  readonly videoInputDisabled$: Observable<boolean>;
  /** Observable that emits `true` when audio input is disabled (receive-only). */
  readonly audioInputDisabled$: Observable<boolean>;
  /** Whether video input is currently disabled. */
  readonly videoInputDisabled: boolean;
  /** Whether audio input is currently disabled. */
  readonly audioInputDisabled: boolean;

  // Section 5.1: Storage integration

  /** Injects the storage manager for device persistence. */
  setStorageManager(storageManager: import('../managers/StorageManager').StorageManager): void;

  // Section 5.11: Factory reset support

  /** Clears all device state (history, selections, persisted prefs) and re-enumerates. */
  clearDeviceState(): Promise<void>;

  /** Force a device re-enumeration. */
  enumerateDevices(): Promise<void>;
}
