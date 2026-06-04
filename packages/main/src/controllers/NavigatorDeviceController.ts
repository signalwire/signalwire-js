import { debounceTime, distinctUntilChanged, interval, map, takeUntil, tap } from 'rxjs';

import { DeviceHistoryManager } from './DeviceHistoryManager';
import { Destroyable } from '../behaviors/Destroyable';
import { PreferencesContainer } from '../containers/PreferencesContainer';
import {
  DEVICE_STORAGE_KEY_AUDIO_INPUT,
  DEVICE_STORAGE_KEY_AUDIO_OUTPUT,
  DEVICE_STORAGE_KEY_VIDEO_INPUT
} from '../core/constants';
import { getLogger } from '../utils/logger';
import { toError } from '../utils/toError';

import type { StoredDevicePreference, DeviceRecoveryEvent } from '../core/types/resilience.types';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { DeviceController } from '../interfaces/DeviceController';
import type { StorageManager } from '../managers/StorageManager';
import type { Observable, Subscription } from 'rxjs';

const logger = getLogger();

type DeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

interface DevicesState {
  audioinput: MediaDeviceInfo[];
  audiooutput: MediaDeviceInfo[];
  videoinput: MediaDeviceInfo[];
}

interface SelectedDevicesState {
  audioinput: MediaDeviceInfo | null;
  audiooutput: MediaDeviceInfo | null;
  videoinput: MediaDeviceInfo | null;
}

/** Maps a device kind to its storage key. */
const DEVICE_STORAGE_KEYS: Record<DeviceKind, string> = {
  audioinput: DEVICE_STORAGE_KEY_AUDIO_INPUT,
  audiooutput: DEVICE_STORAGE_KEY_AUDIO_OUTPUT,
  videoinput: DEVICE_STORAGE_KEY_VIDEO_INPUT
};

const initialDevicesState: DevicesState = {
  audioinput: [],
  audiooutput: [],
  videoinput: []
};

const initialSelectedDevicesState: SelectedDevicesState = {
  audioinput: null,
  audiooutput: null,
  videoinput: null
};

export class NavigatorDeviceController extends Destroyable implements DeviceController {
  private deviceChangeHandler = () => {
    logger.debug('[DeviceController] Device change detected');
    void this.enumerateDevices();
  };

  private _devicesPoolingSubscription?: Subscription;
  private _devicesState$ = this.createBehaviorSubject<DevicesState>(initialDevicesState);
  private _selectedDevicesState$ = this.createBehaviorSubject<SelectedDevicesState>(
    initialSelectedDevicesState
  );

  // Error stream
  private _errors$ = this.createReplaySubject<Error>(1);

  // Device history for succession chain (Section 5.2)
  private _deviceHistory = new DeviceHistoryManager();
  private _deviceRecovered$ = this.createSubject<DeviceRecoveryEvent>();

  // Section 5.9: Intentional device disable
  private _audioInputDisabled$ = this.createBehaviorSubject<boolean>(false);
  private _videoInputDisabled$ = this.createBehaviorSubject<boolean>(false);

  // Section 5.9: Last selection before disable, for restore on enable
  private _lastAudioInputBeforeDisable: MediaDeviceInfo | null = null;
  private _lastVideoInputBeforeDisable: MediaDeviceInfo | null = null;

  // Section 5.1: Loaded persisted device preferences (populated on init)
  private _persistedDevices: Partial<Record<DeviceKind, StoredDevicePreference>> = {};

  // Storage manager (optional) for device persistence (Section 5.1)
  private _storageManager?: StorageManager;

  constructor(
    private readonly webRTCApiProvider: WebRTCApiProvider,
    storageManager?: StorageManager
  ) {
    super();
    this._storageManager = storageManager;
    this.init();
  }

  // ---- Section 5.1: Storage Manager access ----

  /** Sets the storage manager for device persistence. */
  public setStorageManager(storageManager: StorageManager): void {
    this._storageManager = storageManager;
    // Reload persisted devices when storage becomes available
    void this.loadPersistedDevices();
  }

  // ---- Constraints ----

  public get selectedAudioInputDeviceConstraints(): MediaTrackConstraints | boolean {
    if (this._audioInputDisabled$.value) {
      return false;
    }
    return this.deviceInfoToConstraints(this.selectedAudioInputDevice);
  }

  public get selectedVideoInputDeviceConstraints(): MediaTrackConstraints | boolean {
    if (this._videoInputDisabled$.value) {
      return false;
    }
    return this.deviceInfoToConstraints(this.selectedVideoInputDevice);
  }

  public deviceInfoToConstraints(deviceInfo: MediaDeviceInfo | null): MediaTrackConstraints {
    if (!deviceInfo?.deviceId || deviceInfo.deviceId.trim() === '') {
      return {};
    }
    const devices =
      deviceInfo.kind === 'audioinput' ? this.audioInputDevices : this.videoInputDevices;
    const device =
      devices.find((device) => device.deviceId === deviceInfo.deviceId) ??
      devices.find((device) => device.label === deviceInfo.label);
    if (device) {
      return { deviceId: { exact: device.deviceId } };
    }
    return {};
  }

  public get errors$(): Observable<Error> {
    return this.cachedObservable('errors$', () =>
      this._errors$.asObservable().pipe(takeUntil(this.destroyed$))
    );
  }

  /** Observable that emits when the SDK auto-switches a device. */
  public get deviceRecovered$(): Observable<DeviceRecoveryEvent> {
    return this._deviceRecovered$.asObservable().pipe(takeUntil(this.destroyed$));
  }

  // ---- Section 5.9: Disable/enable observables ----

  public get videoInputDisabled$(): Observable<boolean> {
    return this.cachedObservable('videoInputDisabled$', () =>
      this._videoInputDisabled$
        .asObservable()
        .pipe(distinctUntilChanged(), takeUntil(this.destroyed$))
    );
  }

  public get audioInputDisabled$(): Observable<boolean> {
    return this.cachedObservable('audioInputDisabled$', () =>
      this._audioInputDisabled$
        .asObservable()
        .pipe(distinctUntilChanged(), takeUntil(this.destroyed$))
    );
  }

  public get videoInputDisabled(): boolean {
    return this._videoInputDisabled$.value;
  }

  public get audioInputDisabled(): boolean {
    return this._audioInputDisabled$.value;
  }

  // ---- Observable getters for device lists by kind ----

  public get audioInputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.cachedObservable('audioInputDevices$', () =>
      this._devicesState$.pipe(
        map((state) => state.audioinput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
    );
  }

  public get audioOutputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.cachedObservable('audioOutputDevices$', () =>
      this._devicesState$.pipe(
        map((state) => state.audiooutput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
    );
  }

  public get videoInputDevices$(): Observable<MediaDeviceInfo[]> {
    return this.cachedObservable('videoInputDevices$', () =>
      this._devicesState$.pipe(
        map((state) => state.videoinput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$)
      )
    );
  }

  public get selectedAudioInputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.cachedObservable('selectedAudioInputDevice$', () =>
      this._selectedDevicesState$.asObservable().pipe(
        map((state) => state.audioinput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$),
        tap((info) => logger.debug('[DeviceController] Selected audio input device changed:', info))
      )
    );
  }

  public get selectedAudioOutputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.cachedObservable('selectedAudioOutputDevice$', () =>
      this._selectedDevicesState$.asObservable().pipe(
        map((state) => state.audiooutput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$),
        tap((info) =>
          logger.debug('[DeviceController] Selected audio output device changed:', info)
        )
      )
    );
  }

  public get selectedVideoInputDevice$(): Observable<MediaDeviceInfo | null> {
    return this.cachedObservable('selectedVideoInputDevice$', () =>
      this._selectedDevicesState$.asObservable().pipe(
        map((state) => state.videoinput),
        distinctUntilChanged(),
        takeUntil(this.destroyed$),
        tap((info) => logger.debug('[DeviceController] Selected video input device changed:', info))
      )
    );
  }

  // Current value getters for selected devices
  public get selectedAudioInputDevice(): MediaDeviceInfo | null {
    if (this._audioInputDisabled$.value) {
      return null;
    }
    return this._selectedDevicesState$.value.audioinput;
  }

  public get selectedAudioOutputDevice(): MediaDeviceInfo | null {
    return this._selectedDevicesState$.value.audiooutput;
  }

  public get selectedVideoInputDevice(): MediaDeviceInfo | null {
    if (this._videoInputDisabled$.value) {
      return null;
    }
    return this._selectedDevicesState$.value.videoinput;
  }

  public get audioInputDevices(): MediaDeviceInfo[] {
    return this._devicesState$.value.audioinput;
  }

  public get audioOutputDevices(): MediaDeviceInfo[] {
    return this._devicesState$.value.audiooutput;
  }

  public get videoInputDevices(): MediaDeviceInfo[] {
    return this._devicesState$.value.videoinput;
  }

  // ---- Section 5.9: Disable/enable methods ----

  public disableAudioInput(): void {
    if (!this._audioInputDisabled$.value) {
      this._lastAudioInputBeforeDisable = this._selectedDevicesState$.value.audioinput;
      this._audioInputDisabled$.next(true);
      // Emit null on selected device when disabled
      this._selectedDevicesState$.next({
        ...this._selectedDevicesState$.value,
        audioinput: null
      });
    }
  }

  public enableAudioInput(): void {
    if (this._audioInputDisabled$.value) {
      this._audioInputDisabled$.next(false);
      // Restore last selection or auto-select
      const restored = this._lastAudioInputBeforeDisable ?? this.audioInputDevices[0];
      this._selectedDevicesState$.next({
        ...this._selectedDevicesState$.value,
        audioinput: restored
      });
      this._lastAudioInputBeforeDisable = null;
    }
  }

  public disableVideoInput(): void {
    if (!this._videoInputDisabled$.value) {
      this._lastVideoInputBeforeDisable = this._selectedDevicesState$.value.videoinput;
      this._videoInputDisabled$.next(true);
      this._selectedDevicesState$.next({
        ...this._selectedDevicesState$.value,
        videoinput: null
      });
    }
  }

  public enableVideoInput(): void {
    if (this._videoInputDisabled$.value) {
      this._videoInputDisabled$.next(false);
      const restored = this._lastVideoInputBeforeDisable ?? this.videoInputDevices[0];
      this._selectedDevicesState$.next({
        ...this._selectedDevicesState$.value,
        videoinput: restored
      });
      this._lastVideoInputBeforeDisable = null;
    }
  }

  // ---- Setters for selected devices ----

  public selectAudioInputDevice(device: MediaDeviceInfo | null): void {
    // If user selects while disabled, re-enable
    if (this._audioInputDisabled$.value && device) {
      this._audioInputDisabled$.next(false);
    }
    const previous = this._selectedDevicesState$.value.audioinput;
    if (previous && previous.deviceId !== device?.deviceId) {
      this._deviceHistory.push('audioinput', previous);
    }
    this._selectedDevicesState$.next({
      ...this._selectedDevicesState$.value,
      audioinput: device
    });
    if (device) {
      void this.persistDeviceSelection('audioinput', device);
    }
  }

  public selectVideoInputDevice(device: MediaDeviceInfo | null): void {
    logger.debug('[DeviceController] Setting selected video input device:', device);
    if (this._videoInputDisabled$.value && device) {
      this._videoInputDisabled$.next(false);
    }
    const previous = this._selectedDevicesState$.value.videoinput;
    if (previous && previous.deviceId !== device?.deviceId) {
      this._deviceHistory.push('videoinput', previous);
    }
    this._selectedDevicesState$.next({
      ...this._selectedDevicesState$.value,
      videoinput: device
    });
    if (device) {
      void this.persistDeviceSelection('videoinput', device);
    }
  }

  public selectAudioOutputDevice(device: MediaDeviceInfo | null): void {
    const previous = this._selectedDevicesState$.value.audiooutput;
    if (previous && previous.deviceId !== device?.deviceId) {
      this._deviceHistory.push('audiooutput', previous);
    }
    this._selectedDevicesState$.next({
      ...this._selectedDevicesState$.value,
      audiooutput: device
    });
    if (device) {
      void this.persistDeviceSelection('audiooutput', device);
    }
  }

  private init(): void {
    // Load persisted device preferences (Section 5.1)
    void this.loadPersistedDevices();

    // Subscribe to device state changes and auto-select devices
    this.subscribeTo(
      this._devicesState$.pipe(debounceTime(PreferencesContainer.instance.deviceDebounceTime)),
      (devicesState) => {
        // Skip auto-resolution if syncDevicesToActiveCalls is disabled (Section 5.5)
        const currentSelected = this._selectedDevicesState$.value;

        const newAudioInput = this._audioInputDisabled$.value
          ? null
          : this.resolveDevice(
              'audioinput',
              devicesState.audioinput,
              currentSelected.audioinput,
              PreferencesContainer.instance.preferredAudioInput
            );

        const newAudioOutput = this.resolveDevice(
          'audiooutput',
          devicesState.audiooutput,
          currentSelected.audiooutput,
          PreferencesContainer.instance.preferredAudioOutput
        );

        const newVideoInput = this._videoInputDisabled$.value
          ? null
          : this.resolveDevice(
              'videoinput',
              devicesState.videoinput,
              currentSelected.videoinput,
              PreferencesContainer.instance.preferredVideoInput
            );

        // Only update if something changed
        if (
          newAudioInput !== currentSelected.audioinput ||
          newAudioOutput !== currentSelected.audiooutput ||
          newVideoInput !== currentSelected.videoinput
        ) {
          // Section 5.5: Gate auto-switch on syncDevicesToActiveCalls preference.
          // When disabled, only update if there is no current selection (first init)
          // or the device was explicitly null already.
          const shouldSync = PreferencesContainer.instance.syncDevicesToActiveCalls;
          this._selectedDevicesState$.next({
            audioinput:
              shouldSync || !currentSelected.audioinput
                ? newAudioInput
                : currentSelected.audioinput,
            audiooutput:
              shouldSync || !currentSelected.audiooutput
                ? newAudioOutput
                : currentSelected.audiooutput,
            videoinput:
              shouldSync || !currentSelected.videoinput ? newVideoInput : currentSelected.videoinput
          });
        }
      }
    );

    void this.enumerateDevices();
  }

  /**
   * Resolves the best device for a given kind, using device history
   * for succession when the selected device disappears.
   * Section 5.1 adds persisted device resolution.
   * Section 5.4 adds duplicate-named device handling.
   */
  private resolveDevice(
    kind: DeviceKind,
    devices: MediaDeviceInfo[],
    selected: MediaDeviceInfo | null,
    preferred: MediaDeviceInfo | null
  ): MediaDeviceInfo | null {
    // If no devices, return null
    if (devices.length === 0) {
      return null;
    }

    // If selected device is still available, keep it
    if (selected) {
      const exactMatch = devices.find((device) => device.deviceId === selected.deviceId);
      if (exactMatch) {
        return selected;
      }

      // Section 5.4: Label match with duplicate handling
      const labelMatches = devices.filter((device) => device.label === selected.label);
      if (labelMatches.length === 1) {
        return labelMatches[0];
      }
      if (labelMatches.length > 1) {
        // Try groupId match among the label matches
        const groupMatch = labelMatches.find((device) => device.groupId === selected.groupId);
        if (groupMatch) {
          return groupMatch;
        }
        // Ambiguous - emit event and don't auto-switch
        this.emitDeviceRecovered(kind, selected, null, 'ambiguous_match');
        return null;
      }

      // Selected device disappeared - try device history succession
      const fromHistory = this._deviceHistory.findInHistory(kind, devices);
      if (fromHistory) {
        logger.debug(
          `[DeviceController] Device disappeared, falling back to history: ${fromHistory.label}`
        );
        this.emitDeviceRecovered(kind, selected, fromHistory, 'device_disconnected');
        return fromHistory;
      }

      // No history match - fall back to preferred or first available
      const replacement = preferred
        ? devices.find(
            (device) => device.deviceId === preferred.deviceId || device.label === preferred.label
          )
        : undefined;
      const newDevice = replacement ?? devices[0];
      this.emitDeviceRecovered(kind, selected, newDevice, 'fallback_to_default');
      return newDevice;
    }

    // No selected device - try persisted device (Section 5.1)
    const persisted = this._persistedDevices[kind];
    if (persisted) {
      const fromPersisted = this.resolvePersistedDevice(kind, persisted, devices);
      if (fromPersisted) {
        return fromPersisted;
      }
    }

    // No selected device - use preferred or first available
    if (preferred) {
      const preferredDevice = devices.find(
        (device) => device.deviceId === preferred.deviceId || device.label === preferred.label
      );
      if (preferredDevice) {
        return preferredDevice;
      }
    }
    return devices[0];
  }

  /**
   * Section 5.1: Resolves a stored device preference against the current device list.
   * Priority: exact deviceId > groupId+label > label (single match only)
   */
  private resolvePersistedDevice(
    _kind: DeviceKind,
    stored: StoredDevicePreference,
    devices: MediaDeviceInfo[]
  ): MediaDeviceInfo | null {
    // 1. Exact deviceId match
    const exactMatch = devices.find((d) => d.deviceId === stored.deviceId);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. groupId + label match
    const groupLabelMatch = devices.find(
      (d) => d.groupId === stored.groupId && d.label === stored.label
    );
    if (groupLabelMatch) {
      return groupLabelMatch;
    }

    // 3. label match (single match only to avoid ambiguity)
    const labelMatches = devices.filter((d) => d.label === stored.label);
    if (labelMatches.length === 1) {
      return labelMatches[0];
    }

    return null;
  }

  private emitDeviceRecovered(
    kind: DeviceKind,
    previousDevice: MediaDeviceInfo | null,
    newDevice: MediaDeviceInfo | null,
    reason: DeviceRecoveryEvent['reason']
  ): void {
    try {
      this._deviceRecovered$.next({
        kind,
        previousDevice,
        newDevice,
        reason
      });
    } catch {
      // Non-fatal: observer might already be completed
    }
  }

  // ---- Section 5.1: Device persistence ----

  private async persistDeviceSelection(kind: DeviceKind, device: MediaDeviceInfo): Promise<void> {
    if (!this._storageManager || !PreferencesContainer.instance.persistDeviceSelection) {
      return;
    }
    const stored: StoredDevicePreference = {
      deviceId: device.deviceId,
      label: device.label,
      kind: device.kind,
      groupId: device.groupId
    };
    try {
      await this._storageManager.setItem(DEVICE_STORAGE_KEYS[kind], stored, 'local');
    } catch (error) {
      logger.error(`[DeviceController] Failed to persist device selection for ${kind}:`, error);
    }
  }

  private async loadPersistedDevices(): Promise<void> {
    if (!this._storageManager || !PreferencesContainer.instance.persistDeviceSelection) {
      return;
    }
    const kinds: DeviceKind[] = ['audioinput', 'audiooutput', 'videoinput'];
    for (const kind of kinds) {
      try {
        const stored = await this._storageManager.getItem<StoredDevicePreference>(
          DEVICE_STORAGE_KEYS[kind],
          'local'
        );
        if (stored) {
          this._persistedDevices = { ...this._persistedDevices, [kind]: stored };
        }
      } catch (error) {
        logger.error(`[DeviceController] Failed to load persisted device for ${kind}:`, error);
      }
    }
  }

  // ---- Section 5.11: Clear device state for factory reset ----

  /** Clears device history, persisted selections, and re-enumerates devices. */
  public async clearDeviceState(): Promise<void> {
    this._deviceHistory.clear();
    this._persistedDevices = {};
    this._lastAudioInputBeforeDisable = null;
    this._lastVideoInputBeforeDisable = null;
    this._audioInputDisabled$.next(false);
    this._videoInputDisabled$.next(false);
    this._selectedDevicesState$.next(initialSelectedDevicesState);
    await this.enumerateDevices();
  }

  public enableDeviceMonitoring(): void {
    this.disableDeviceMonitoring();
    this.webRTCApiProvider.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);

    if (PreferencesContainer.instance.devicePollingInterval > 0) {
      this._devicesPoolingSubscription = interval(
        PreferencesContainer.instance.devicePollingInterval
      ).subscribe(() => {
        logger.debug('[DeviceController] Polling devices due to interval');
        void this.enumerateDevices();
      });
    }

    void this.enumerateDevices();
  }

  public disableDeviceMonitoring(): void {
    this.webRTCApiProvider.mediaDevices.removeEventListener(
      'devicechange',
      this.deviceChangeHandler
    );
    if (this._devicesPoolingSubscription) {
      this._devicesPoolingSubscription.unsubscribe();
      this._devicesPoolingSubscription = undefined;
    }
  }

  public async enumerateDevices(): Promise<void> {
    try {
      const devices = await this.webRTCApiProvider.mediaDevices.enumerateDevices();

      const devicesByKind: DevicesState = devices.reduce(
        (acc, device) => {
          const kind = device.kind as keyof DevicesState;
          return {
            ...acc,
            [kind]: [...acc[kind], device]
          };
        },
        {
          audioinput: [],
          audiooutput: [],
          videoinput: []
        } as DevicesState
      );

      // Update state in a single emission
      this._devicesState$.next(devicesByKind);

      logger.debug('[DeviceController] Devices enumerated:', {
        audioInputs: devicesByKind.audioinput.length,
        audioOutputs: devicesByKind.audiooutput.length,
        videoInputs: devicesByKind.videoinput.length
      });
    } catch (error) {
      logger.error('[DeviceController] Failed to enumerate devices:', error);
      this._errors$.next(toError(error));
    }
  }

  public async getDeviceCapabilities(
    deviceInfo: MediaDeviceInfo
  ): Promise<MediaTrackCapabilities | null> {
    if (deviceInfo.kind === 'audiooutput') {
      return null;
    }

    try {
      const constraints = this.deviceInfoToConstraints(deviceInfo);
      const stream = await this.webRTCApiProvider.mediaDevices.getUserMedia({
        audio: deviceInfo.kind === 'audioinput' ? constraints : false,
        video: deviceInfo.kind === 'videoinput' ? constraints : false
      });

      const track =
        deviceInfo.kind === 'audioinput' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

      const capabilities = track.getCapabilities();

      // Stop all tracks to release devices
      stream.getTracks().forEach((t) => t.stop());

      return capabilities;
    } catch (error) {
      logger.error('[DeviceController] Failed to get device capabilities:', error);
      this._errors$.next(toError(error));
      throw error;
    }
  }

  public async isValidDevice(deviceInfo: MediaDeviceInfo | null): Promise<boolean> {
    if (!deviceInfo || deviceInfo.kind === 'audiooutput') {
      return false;
    }
    try {
      const capabilities = await this.getDeviceCapabilities(deviceInfo);
      return capabilities !== null;
    } catch {
      return false;
    }
  }

  public destroy(): void {
    this.disableDeviceMonitoring();
    super.destroy();
  }
}
