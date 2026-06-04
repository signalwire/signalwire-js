import {
  DEFAULT_CONNECTION_TIMEOUT_MS,
  DEFAULT_DEVICE_DEBOUNCE_TIME_MS,
  DEFAULT_DEVICE_POLLING_INTERVAL_MS,
  DEFAULT_ICE_CANDIDATE_TIMEOUT_MS,
  DEFAULT_ICE_GATHERING_TIMEOUT_MS,
  DEFAULT_RECONNECT_CALLS_TIMEOUT_MS,
  DEFAULT_RECONNECT_DELAY_MAX_MS,
  DEFAULT_RECONNECT_DELAY_MIN_MS,
  PREFERENCES_STORAGE_KEY,
  DEFAULT_STATS_POLLING_INTERVAL_MS,
  DEFAULT_STATS_BASELINE_SAMPLES,
  DEFAULT_STATS_NO_PACKET_THRESHOLD_MS,
  DEFAULT_STATS_RTT_SPIKE_MULTIPLIER,
  DEFAULT_STATS_PACKET_LOSS_THRESHOLD,
  DEFAULT_STATS_JITTER_SPIKE_MULTIPLIER,
  DEFAULT_STATS_HISTORY_SIZE,
  DEFAULT_KEYFRAME_MAX_BURST,
  DEFAULT_KEYFRAME_BURST_WINDOW_MS,
  DEFAULT_KEYFRAME_COOLDOWN_MS,
  DEFAULT_REINVITE_DEBOUNCE_TIME_MS,
  DEFAULT_REINVITE_MAX_ATTEMPTS,
  DEFAULT_REINVITE_TIMEOUT_MS,
  DEFAULT_RECOVERY_DEBOUNCE_TIME_MS,
  DEFAULT_RECOVERY_COOLDOWN_MS,
  DEFAULT_ICE_DISCONNECTED_GRACE_PERIOD_MS,
  DEFAULT_ICE_RESTART_TIMEOUT_MS,
  DEFAULT_MAX_RECOVERY_ATTEMPTS,
  DEFAULT_PERSIST_DEVICE_SELECTION,
  DEFAULT_SYNC_DEVICES_TO_ACTIVE_CALLS,
  DEFAULT_AUTO_MUTE_VIDEO_ON_HIDDEN,
  DEFAULT_REFRESH_DEVICES_ON_VISIBLE,
  DEFAULT_CHECK_CONNECTION_ON_VISIBLE,
  DEFAULT_ENABLE_AUTO_DEGRADATION,
  DEFAULT_DEGRADATION_BITRATE_THRESHOLD_KBPS,
  DEFAULT_DEGRADATION_RECOVERY_THRESHOLD_KBPS,
  DEFAULT_ENABLE_RELAY_FALLBACK,
  DEFAULT_ENABLE_NETWORK_CHANGE_DETECTION,
  DEFAULT_ENABLE_SERVER_HANGUP_INTERCEPTION,
  DEFAULT_STEREO_AUDIO
} from '../core/constants';
import { getLogger } from '../utils/logger';
import { fromMsToSec, fromSecToMs } from '../utils/time';

import type { MediaOptions } from '../core/types/media.types';
import type { StorageManager } from '../managers/StorageManager';

const logger = getLogger();

export interface Preferences {
  connectionTimeout: number;
  reconnectDelayMin: number;
  reconnectDelayMax: number;
  reconnectCallsTimeout: number;
  relayHost?: string;
  receiveVideo: boolean;
  receiveAudio: boolean;
  preferredAudioInput: MediaDeviceInfo | null;
  preferredAudioOutput: MediaDeviceInfo | null;
  preferredVideoInput: MediaDeviceInfo | null;
  inputAudioDeviceConstraints: MediaTrackConstraints | undefined;
  inputVideoDeviceConstraints: MediaTrackConstraints | undefined;
  disableUdpIceServers: boolean;
  relayOnly: boolean;
  iceCandidateTimeout: number;
  iceGatheringTimeout: number;
  deviceDebounceTime: number;
  devicePollingInterval: number;
  iceServers?: RTCIceServer[];
  defaultSignalWireOptions: {
    skipConnection: boolean;
    skipRegister: boolean;
    reconnectAttachedCalls: boolean;
    skipDeviceMonitoring: boolean;
    savePreferences: boolean;
  };
  inviteSubscribeScreenshare: string[];
  inviteSubscribeAdditionalDevice: string[];
  inviteSubscribeMainDevice: string[];
  userVariables: Record<string, unknown>;
  readonly preferredMediaOptions: MediaOptions;

  // Stats monitoring (Section 1)
  statsPollingInterval: number;
  statsBaselineSamples: number;
  statsNoPacketThreshold: number;
  statsRttSpikeMultiplier: number;
  statsPacketLossThreshold: number;
  statsJitterSpikeMultiplier: number;
  statsHistorySize: number;

  // Keyframe throttling (Section 2)
  keyframeMaxBurst: number;
  keyframeBurstWindow: number;
  keyframeCooldown: number;

  // Re-INVITE / ICE restart (Section 2 & 19)
  reinviteDebounceTime: number;
  reinviteMaxAttempts: number;
  reinviteTimeout: number;

  // Recovery pipeline (Section 19)
  recoveryDebounceTime: number;
  recoveryCooldown: number;
  iceDisconnectedGracePeriod: number;
  iceRestartTimeout: number;
  maxRecoveryAttempts: number;
  enableRelayFallback: boolean;
  enableNetworkChangeDetection: boolean;
  enableServerHangupInterception: boolean;

  // Device management (Section 5)
  persistDeviceSelection: boolean;
  syncDevicesToActiveCalls: boolean;

  // Visibility (Section 4)
  autoMuteVideoOnHidden: boolean;
  refreshDevicesOnVisible: boolean;
  checkConnectionOnVisible: boolean;

  // Media defaults (Section 16.5 & 16.6)
  defaultAudioConstraints: MediaTrackConstraints | undefined;
  defaultVideoConstraints: MediaTrackConstraints | undefined;
  stereoAudio: boolean;

  // Degradation (Section 22)
  enableAutoDegradation: boolean;
  degradationBitrateThreshold: number;
  degradationRecoveryThreshold: number;

  // Codec preferences (Section 23)
  preferredVideoCodecs: string[];
  preferredAudioCodecs: string[];
}
export class PreferencesContainer implements Preferences {
  static get instance(): Preferences {
    this._instance ??= new PreferencesContainer();
    return this._instance;
  }

  deviceDebounceTime = DEFAULT_DEVICE_DEBOUNCE_TIME_MS;
  devicePollingInterval = DEFAULT_DEVICE_POLLING_INTERVAL_MS;

  reconnectCallsTimeout = DEFAULT_RECONNECT_CALLS_TIMEOUT_MS;
  // 5 minutes
  iceServers?: RTCIceServer[];
  connectionTimeout = DEFAULT_CONNECTION_TIMEOUT_MS;
  reconnectDelayMin = DEFAULT_RECONNECT_DELAY_MIN_MS;
  reconnectDelayMax = DEFAULT_RECONNECT_DELAY_MAX_MS;
  disableUdpIceServers = false;
  relayOnly = false;
  iceCandidateTimeout = DEFAULT_ICE_CANDIDATE_TIMEOUT_MS;
  iceGatheringTimeout = DEFAULT_ICE_GATHERING_TIMEOUT_MS;
  defaultSignalWireOptions = {
    skipConnection: false,
    skipRegister: false,
    reconnectAttachedCalls: false,
    skipDeviceMonitoring: false,
    savePreferences: false
  };
  relayHost?: string;
  receiveVideo = false;
  receiveAudio = true;
  preferredAudioInput: MediaDeviceInfo | null = null;
  preferredAudioOutput: MediaDeviceInfo | null = null;
  preferredVideoInput: MediaDeviceInfo | null = null;
  inviteSubscribeScreenshare: string[] = ['video.room.screenshare'];
  inviteSubscribeAdditionalDevice: string[] = [
    // FIXME verify what to subscribe to for additional devices
  ];
  inviteSubscribeMainDevice: string[] = [
    'track',
    'destroy',
    'member.updated.videoMuted',
    'layout.changed',
    'room.subscribed',
    'member.updated.audioMuted',
    'media.connected',
    'room.updated',
    'call.joined'
  ];
  userVariables = {};

  // Stats monitoring
  statsPollingInterval = DEFAULT_STATS_POLLING_INTERVAL_MS;
  statsBaselineSamples = DEFAULT_STATS_BASELINE_SAMPLES;
  statsNoPacketThreshold = DEFAULT_STATS_NO_PACKET_THRESHOLD_MS;
  statsRttSpikeMultiplier = DEFAULT_STATS_RTT_SPIKE_MULTIPLIER;
  statsPacketLossThreshold = DEFAULT_STATS_PACKET_LOSS_THRESHOLD;
  statsJitterSpikeMultiplier = DEFAULT_STATS_JITTER_SPIKE_MULTIPLIER;
  statsHistorySize = DEFAULT_STATS_HISTORY_SIZE;

  // Keyframe throttling
  keyframeMaxBurst = DEFAULT_KEYFRAME_MAX_BURST;
  keyframeBurstWindow = DEFAULT_KEYFRAME_BURST_WINDOW_MS;
  keyframeCooldown = DEFAULT_KEYFRAME_COOLDOWN_MS;

  // Re-INVITE / ICE restart
  reinviteDebounceTime = DEFAULT_REINVITE_DEBOUNCE_TIME_MS;
  reinviteMaxAttempts = DEFAULT_REINVITE_MAX_ATTEMPTS;
  reinviteTimeout = DEFAULT_REINVITE_TIMEOUT_MS;

  // Recovery pipeline
  recoveryDebounceTime = DEFAULT_RECOVERY_DEBOUNCE_TIME_MS;
  recoveryCooldown = DEFAULT_RECOVERY_COOLDOWN_MS;
  iceDisconnectedGracePeriod = DEFAULT_ICE_DISCONNECTED_GRACE_PERIOD_MS;
  iceRestartTimeout = DEFAULT_ICE_RESTART_TIMEOUT_MS;
  maxRecoveryAttempts = DEFAULT_MAX_RECOVERY_ATTEMPTS;
  enableRelayFallback = DEFAULT_ENABLE_RELAY_FALLBACK;
  enableNetworkChangeDetection = DEFAULT_ENABLE_NETWORK_CHANGE_DETECTION;
  enableServerHangupInterception = DEFAULT_ENABLE_SERVER_HANGUP_INTERCEPTION;

  // Device management
  persistDeviceSelection = DEFAULT_PERSIST_DEVICE_SELECTION;
  syncDevicesToActiveCalls = DEFAULT_SYNC_DEVICES_TO_ACTIVE_CALLS;

  // Visibility
  autoMuteVideoOnHidden = DEFAULT_AUTO_MUTE_VIDEO_ON_HIDDEN;
  refreshDevicesOnVisible = DEFAULT_REFRESH_DEVICES_ON_VISIBLE;
  checkConnectionOnVisible = DEFAULT_CHECK_CONNECTION_ON_VISIBLE;

  // Media defaults
  defaultAudioConstraints: MediaTrackConstraints | undefined = undefined;
  defaultVideoConstraints: MediaTrackConstraints | undefined = undefined;
  stereoAudio = DEFAULT_STEREO_AUDIO;

  // Degradation
  enableAutoDegradation = DEFAULT_ENABLE_AUTO_DEGRADATION;
  degradationBitrateThreshold = DEFAULT_DEGRADATION_BITRATE_THRESHOLD_KBPS;
  degradationRecoveryThreshold = DEFAULT_DEGRADATION_RECOVERY_THRESHOLD_KBPS;

  // Codec preferences
  preferredVideoCodecs: string[] = [];
  preferredAudioCodecs: string[] = [];

  private _inputAudioDeviceConstraints?: MediaTrackConstraints;
  private _inputVideoDeviceConstraints?: MediaTrackConstraints;
  private static _instance?: PreferencesContainer;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public get preferredMediaOptions(): MediaOptions {
    return {
      receiveVideo: this.receiveVideo,
      receiveAudio: this.receiveAudio,
      inputAudioDeviceConstraints: this.inputAudioDeviceConstraints,
      inputVideoDeviceConstraints: this.inputVideoDeviceConstraints
    };
  }

  get inputAudioDeviceConstraints(): MediaTrackConstraints | undefined {
    return this._inputAudioDeviceConstraints;
  }

  set inputAudioDeviceConstraints(value: MediaTrackConstraints | undefined) {
    this._inputAudioDeviceConstraints = value;
  }

  get inputVideoDeviceConstraints(): MediaTrackConstraints | undefined {
    return this._inputVideoDeviceConstraints;
  }

  set inputVideoDeviceConstraints(value: MediaTrackConstraints | undefined) {
    this._inputVideoDeviceConstraints = value;
  }
}

/** Serializable subset of preferences that can be persisted to storage. */
interface StoredPreferences {
  connectionTimeout?: number;
  reconnectCallsTimeout?: number;
  reconnectDelayMin?: number;
  reconnectDelayMax?: number;
  relayHost?: string;
  receiveVideo?: boolean;
  receiveAudio?: boolean;
  disableUdpIceServers?: boolean;
  relayOnly?: boolean;
  iceCandidateTimeout?: number;
  iceGatheringTimeout?: number;
  deviceDebounceTime?: number;
  devicePollingInterval?: number;
  iceServers?: RTCIceServer[];
  userVariables?: Record<string, unknown>;

  // Stats monitoring
  statsPollingInterval?: number;
  statsBaselineSamples?: number;
  statsNoPacketThreshold?: number;
  statsRttSpikeMultiplier?: number;
  statsPacketLossThreshold?: number;
  statsJitterSpikeMultiplier?: number;
  statsHistorySize?: number;

  // Keyframe throttling
  keyframeMaxBurst?: number;
  keyframeBurstWindow?: number;
  keyframeCooldown?: number;

  // Re-INVITE / ICE restart
  reinviteDebounceTime?: number;
  reinviteMaxAttempts?: number;
  reinviteTimeout?: number;

  // Recovery pipeline
  recoveryDebounceTime?: number;
  recoveryCooldown?: number;
  iceDisconnectedGracePeriod?: number;
  iceRestartTimeout?: number;
  maxRecoveryAttempts?: number;
  enableRelayFallback?: boolean;
  enableNetworkChangeDetection?: boolean;
  enableServerHangupInterception?: boolean;

  // Device management
  persistDeviceSelection?: boolean;
  syncDevicesToActiveCalls?: boolean;

  // Visibility
  autoMuteVideoOnHidden?: boolean;
  refreshDevicesOnVisible?: boolean;
  checkConnectionOnVisible?: boolean;

  // Media defaults
  stereoAudio?: boolean;

  // Degradation
  enableAutoDegradation?: boolean;
  degradationBitrateThreshold?: number;
  degradationRecoveryThreshold?: number;

  // Codec preferences
  preferredVideoCodecs?: string[];
  preferredAudioCodecs?: string[];
}

/** Keys of StoredPreferences that map to number fields on PreferencesContainer. */
const STORED_NUMBER_KEYS: (keyof StoredPreferences & keyof Preferences)[] = [
  'connectionTimeout',
  'reconnectCallsTimeout',
  'reconnectDelayMin',
  'reconnectDelayMax',
  'iceCandidateTimeout',
  'iceGatheringTimeout',
  'deviceDebounceTime',
  'devicePollingInterval',
  'statsPollingInterval',
  'statsBaselineSamples',
  'statsNoPacketThreshold',
  'statsRttSpikeMultiplier',
  'statsPacketLossThreshold',
  'statsJitterSpikeMultiplier',
  'statsHistorySize',
  'keyframeMaxBurst',
  'keyframeBurstWindow',
  'keyframeCooldown',
  'reinviteDebounceTime',
  'reinviteMaxAttempts',
  'reinviteTimeout',
  'recoveryDebounceTime',
  'recoveryCooldown',
  'iceDisconnectedGracePeriod',
  'iceRestartTimeout',
  'maxRecoveryAttempts',
  'degradationBitrateThreshold',
  'degradationRecoveryThreshold'
];

/** Keys of StoredPreferences that map to boolean fields on PreferencesContainer. */
const STORED_BOOLEAN_KEYS: (keyof StoredPreferences & keyof Preferences)[] = [
  'receiveVideo',
  'receiveAudio',
  'disableUdpIceServers',
  'relayOnly',
  'enableRelayFallback',
  'enableNetworkChangeDetection',
  'enableServerHangupInterception',
  'persistDeviceSelection',
  'syncDevicesToActiveCalls',
  'autoMuteVideoOnHidden',
  'refreshDevicesOnVisible',
  'checkConnectionOnVisible',
  'stereoAudio',
  'enableAutoDegradation'
];

/** Collects the serializable preferences from the container. */
function collectStoredPreferences(): StoredPreferences {
  const container = PreferencesContainer.instance;
  return {
    connectionTimeout: container.connectionTimeout,
    reconnectCallsTimeout: container.reconnectCallsTimeout,
    reconnectDelayMin: container.reconnectDelayMin,
    reconnectDelayMax: container.reconnectDelayMax,
    relayHost: container.relayHost,
    receiveVideo: container.receiveVideo,
    receiveAudio: container.receiveAudio,
    disableUdpIceServers: container.disableUdpIceServers,
    relayOnly: container.relayOnly,
    iceCandidateTimeout: container.iceCandidateTimeout,
    iceGatheringTimeout: container.iceGatheringTimeout,
    deviceDebounceTime: container.deviceDebounceTime,
    devicePollingInterval: container.devicePollingInterval,
    iceServers: container.iceServers,
    userVariables: container.userVariables,
    // Stats monitoring
    statsPollingInterval: container.statsPollingInterval,
    statsBaselineSamples: container.statsBaselineSamples,
    statsNoPacketThreshold: container.statsNoPacketThreshold,
    statsRttSpikeMultiplier: container.statsRttSpikeMultiplier,
    statsPacketLossThreshold: container.statsPacketLossThreshold,
    statsJitterSpikeMultiplier: container.statsJitterSpikeMultiplier,
    statsHistorySize: container.statsHistorySize,
    // Keyframe throttling
    keyframeMaxBurst: container.keyframeMaxBurst,
    keyframeBurstWindow: container.keyframeBurstWindow,
    keyframeCooldown: container.keyframeCooldown,
    // Re-INVITE / ICE restart
    reinviteDebounceTime: container.reinviteDebounceTime,
    reinviteMaxAttempts: container.reinviteMaxAttempts,
    reinviteTimeout: container.reinviteTimeout,
    // Recovery pipeline
    recoveryDebounceTime: container.recoveryDebounceTime,
    recoveryCooldown: container.recoveryCooldown,
    iceDisconnectedGracePeriod: container.iceDisconnectedGracePeriod,
    iceRestartTimeout: container.iceRestartTimeout,
    maxRecoveryAttempts: container.maxRecoveryAttempts,
    enableRelayFallback: container.enableRelayFallback,
    enableNetworkChangeDetection: container.enableNetworkChangeDetection,
    enableServerHangupInterception: container.enableServerHangupInterception,
    // Device management
    persistDeviceSelection: container.persistDeviceSelection,
    syncDevicesToActiveCalls: container.syncDevicesToActiveCalls,
    // Visibility
    autoMuteVideoOnHidden: container.autoMuteVideoOnHidden,
    refreshDevicesOnVisible: container.refreshDevicesOnVisible,
    checkConnectionOnVisible: container.checkConnectionOnVisible,
    // Media defaults
    stereoAudio: container.stereoAudio,
    // Degradation
    enableAutoDegradation: container.enableAutoDegradation,
    degradationBitrateThreshold: container.degradationBitrateThreshold,
    degradationRecoveryThreshold: container.degradationRecoveryThreshold,
    // Codec preferences
    preferredVideoCodecs: container.preferredVideoCodecs,
    preferredAudioCodecs: container.preferredAudioCodecs
  };
}

/** Applies stored preferences to the container. */
function applyStoredPreferences(stored: StoredPreferences): void {
  const container = PreferencesContainer.instance as unknown as Record<string, unknown>;
  for (const key of STORED_NUMBER_KEYS) {
    if (stored[key] !== undefined) container[key] = stored[key];
  }
  for (const key of STORED_BOOLEAN_KEYS) {
    if (stored[key] !== undefined) container[key] = stored[key];
  }
  if (stored.relayHost !== undefined) container.relayHost = stored.relayHost;
  if (stored.iceServers !== undefined) container.iceServers = stored.iceServers;
  if (stored.userVariables !== undefined) container.userVariables = stored.userVariables;
  if (stored.preferredVideoCodecs !== undefined)
    container.preferredVideoCodecs = stored.preferredVideoCodecs;
  if (stored.preferredAudioCodecs !== undefined)
    container.preferredAudioCodecs = stored.preferredAudioCodecs;
}

/**
 * Public preferences API for configuring SDK behavior.
 *
 * Exposed as {@link SignalWire.preferences}. All timeout values
 * are in seconds when accessed through this class.
 *
 * When {@link enableSavePreferences} is called, preferences are
 * automatically loaded from storage and synced back on every change.
 */
export class ClientPreferences {
  private _storage: StorageManager | null = null;

  /**
   * Enables persistence of preferences to storage.
   * Loads any previously saved preferences and syncs future changes.
   */
  public enableSavePreferences(storage: StorageManager): void {
    this._storage = storage;
    this._loadFromStorage();
  }

  /** WebSocket connection timeout in seconds. */
  public get connectionTimeout(): number {
    return fromMsToSec(PreferencesContainer.instance.connectionTimeout);
  }
  public set connectionTimeout(seconds: number) {
    PreferencesContainer.instance.connectionTimeout = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Timeout for reconnecting to previously attached calls, in seconds. */
  public get reconnectCallsTimeout(): number {
    return fromMsToSec(PreferencesContainer.instance.reconnectCallsTimeout);
  }
  public set reconnectCallsTimeout(seconds: number) {
    PreferencesContainer.instance.reconnectCallsTimeout = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Minimum reconnection backoff delay in seconds. */
  public get reconnectDelayMin(): number {
    return fromMsToSec(PreferencesContainer.instance.reconnectDelayMin);
  }
  public set reconnectDelayMin(seconds: number) {
    PreferencesContainer.instance.reconnectDelayMin = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Maximum reconnection backoff delay in seconds. */
  public get reconnectDelayMax(): number {
    return fromMsToSec(PreferencesContainer.instance.reconnectDelayMax);
  }
  public set reconnectDelayMax(seconds: number) {
    PreferencesContainer.instance.reconnectDelayMax = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Custom relay host URL. Empty string uses the default. */
  public get relayHost(): string {
    return PreferencesContainer.instance.relayHost ?? '';
  }
  public set relayHost(value: string) {
    PreferencesContainer.instance.relayHost = value;
    this._saveToStorage();
  }

  /** Whether to receive remote video by default. */
  public get receiveVideo(): boolean {
    return PreferencesContainer.instance.receiveVideo;
  }
  public set receiveVideo(value: boolean) {
    PreferencesContainer.instance.receiveVideo = value;
    this._saveToStorage();
  }

  /** Whether to receive remote audio by default. */
  public get receiveAudio(): boolean {
    return PreferencesContainer.instance.receiveAudio;
  }
  public set receiveAudio(value: boolean) {
    PreferencesContainer.instance.receiveAudio = value;
    this._saveToStorage();
  }

  /** Preferred audio input device for new calls. */
  public get preferredAudioInput(): MediaDeviceInfo | null {
    return PreferencesContainer.instance.preferredAudioInput;
  }
  public set preferredAudioInput(value: MediaDeviceInfo | null) {
    PreferencesContainer.instance.preferredAudioInput = value;
  }

  /** Preferred audio output device for new calls. */
  public get preferredAudioOutput(): MediaDeviceInfo | null {
    return PreferencesContainer.instance.preferredAudioOutput;
  }
  public set preferredAudioOutput(value: MediaDeviceInfo | null) {
    PreferencesContainer.instance.preferredAudioOutput = value;
  }

  /** Preferred video input device for new calls. */
  public get preferredVideoInput(): MediaDeviceInfo | null {
    return PreferencesContainer.instance.preferredVideoInput;
  }
  public set preferredVideoInput(value: MediaDeviceInfo | null) {
    PreferencesContainer.instance.preferredVideoInput = value;
  }

  /** Default audio input track constraints. */
  public get inputAudioConstraints(): MediaTrackConstraints | undefined {
    return PreferencesContainer.instance.inputAudioDeviceConstraints;
  }
  public set inputAudioConstraints(value: MediaTrackConstraints | undefined) {
    PreferencesContainer.instance.inputAudioDeviceConstraints = value;
  }

  /** Default video input track constraints. */
  public get inputVideoConstraints(): MediaTrackConstraints | undefined {
    return PreferencesContainer.instance.inputVideoDeviceConstraints;
  }
  public set inputVideoConstraints(value: MediaTrackConstraints | undefined) {
    PreferencesContainer.instance.inputVideoDeviceConstraints = value;
  }

  /** Debounce time for device change events, in seconds. */
  public get deviceDebounceTime(): number {
    return fromMsToSec(PreferencesContainer.instance.deviceDebounceTime);
  }
  public set deviceDebounceTime(seconds: number) {
    PreferencesContainer.instance.deviceDebounceTime = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Polling interval for device enumeration, in seconds. */
  public get devicePollingInterval(): number {
    return fromMsToSec(PreferencesContainer.instance.devicePollingInterval);
  }
  public set devicePollingInterval(seconds: number) {
    PreferencesContainer.instance.devicePollingInterval = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Whether to filter out UDP-based ICE servers. */
  public get disableUdpIceServers(): boolean {
    return PreferencesContainer.instance.disableUdpIceServers;
  }
  public set disableUdpIceServers(value: boolean) {
    PreferencesContainer.instance.disableUdpIceServers = value;
    this._saveToStorage();
  }

  /** Whether to force TURN relay-only ICE candidates. */
  public get relayOnly(): boolean {
    return PreferencesContainer.instance.relayOnly;
  }
  public set relayOnly(value: boolean) {
    PreferencesContainer.instance.relayOnly = value;
    this._saveToStorage();
  }

  /** Timeout for individual ICE candidate gathering, in seconds. */
  public get iceCandidateTimeout(): number {
    return fromMsToSec(PreferencesContainer.instance.iceCandidateTimeout);
  }
  public set iceCandidateTimeout(seconds: number) {
    PreferencesContainer.instance.iceCandidateTimeout = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Timeout for the entire ICE gathering phase, in seconds. */
  public get iceGatheringTimeout(): number {
    return fromMsToSec(PreferencesContainer.instance.iceGatheringTimeout);
  }
  public set iceGatheringTimeout(seconds: number) {
    PreferencesContainer.instance.iceGatheringTimeout = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Custom ICE servers for TURN/STUN configuration. */
  public get iceServers(): RTCIceServer[] | undefined {
    return PreferencesContainer.instance.iceServers;
  }
  public set iceServers(value: RTCIceServer[] | undefined) {
    PreferencesContainer.instance.iceServers = value;
    this._saveToStorage();
  }

  /** Custom user variables attached to calls. */
  public get userVariables(): Record<string, unknown> {
    return PreferencesContainer.instance.userVariables;
  }
  public set userVariables(value: Record<string, unknown>) {
    PreferencesContainer.instance.userVariables = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Stats monitoring (Section 1)
  // ===========================================================================

  /** Stats polling interval in milliseconds. */
  public get statsPollingInterval(): number {
    return PreferencesContainer.instance.statsPollingInterval;
  }
  public set statsPollingInterval(value: number) {
    PreferencesContainer.instance.statsPollingInterval = value;
    this._saveToStorage();
  }

  /** Number of baseline samples for stats monitoring. */
  public get statsBaselineSamples(): number {
    return PreferencesContainer.instance.statsBaselineSamples;
  }
  public set statsBaselineSamples(value: number) {
    PreferencesContainer.instance.statsBaselineSamples = value;
    this._saveToStorage();
  }

  /** Duration in ms with no inbound packets before a critical issue is emitted. */
  public get statsNoPacketThreshold(): number {
    return PreferencesContainer.instance.statsNoPacketThreshold;
  }
  public set statsNoPacketThreshold(value: number) {
    PreferencesContainer.instance.statsNoPacketThreshold = value;
    this._saveToStorage();
  }

  /** Multiplier for RTT spike detection relative to baseline. */
  public get statsRttSpikeMultiplier(): number {
    return PreferencesContainer.instance.statsRttSpikeMultiplier;
  }
  public set statsRttSpikeMultiplier(value: number) {
    PreferencesContainer.instance.statsRttSpikeMultiplier = value;
    this._saveToStorage();
  }

  /** Packet loss fraction threshold (0-1) for issue detection. */
  public get statsPacketLossThreshold(): number {
    return PreferencesContainer.instance.statsPacketLossThreshold;
  }
  public set statsPacketLossThreshold(value: number) {
    PreferencesContainer.instance.statsPacketLossThreshold = value;
    this._saveToStorage();
  }

  /** Multiplier for jitter spike detection relative to baseline. */
  public get statsJitterSpikeMultiplier(): number {
    return PreferencesContainer.instance.statsJitterSpikeMultiplier;
  }
  public set statsJitterSpikeMultiplier(value: number) {
    PreferencesContainer.instance.statsJitterSpikeMultiplier = value;
    this._saveToStorage();
  }

  /** Number of seconds of metrics history to retain. */
  public get statsHistorySize(): number {
    return PreferencesContainer.instance.statsHistorySize;
  }
  public set statsHistorySize(value: number) {
    PreferencesContainer.instance.statsHistorySize = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Keyframe throttling (Section 2)
  // ===========================================================================

  /** Maximum keyframe requests in a burst window. */
  public get keyframeMaxBurst(): number {
    return PreferencesContainer.instance.keyframeMaxBurst;
  }
  public set keyframeMaxBurst(value: number) {
    PreferencesContainer.instance.keyframeMaxBurst = value;
    this._saveToStorage();
  }

  /** Keyframe burst window duration in milliseconds. */
  public get keyframeBurstWindow(): number {
    return PreferencesContainer.instance.keyframeBurstWindow;
  }
  public set keyframeBurstWindow(value: number) {
    PreferencesContainer.instance.keyframeBurstWindow = value;
    this._saveToStorage();
  }

  /** Cooldown period in ms after keyframe burst limit is reached. */
  public get keyframeCooldown(): number {
    return PreferencesContainer.instance.keyframeCooldown;
  }
  public set keyframeCooldown(value: number) {
    PreferencesContainer.instance.keyframeCooldown = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Re-INVITE / ICE restart (Section 2 & 19)
  // ===========================================================================

  /** Minimum time in ms between re-INVITE attempts. */
  public get reinviteDebounceTime(): number {
    return PreferencesContainer.instance.reinviteDebounceTime;
  }
  public set reinviteDebounceTime(value: number) {
    PreferencesContainer.instance.reinviteDebounceTime = value;
    this._saveToStorage();
  }

  /** Maximum re-INVITE attempts per call. */
  public get reinviteMaxAttempts(): number {
    return PreferencesContainer.instance.reinviteMaxAttempts;
  }
  public set reinviteMaxAttempts(value: number) {
    PreferencesContainer.instance.reinviteMaxAttempts = value;
    this._saveToStorage();
  }

  /** Timeout in ms for a single re-INVITE attempt. */
  public get reinviteTimeout(): number {
    return PreferencesContainer.instance.reinviteTimeout;
  }
  public set reinviteTimeout(value: number) {
    PreferencesContainer.instance.reinviteTimeout = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Recovery pipeline (Section 19)
  // ===========================================================================

  /** Recovery signal debounce window in seconds. */
  public get recoveryDebounceTime(): number {
    return fromMsToSec(PreferencesContainer.instance.recoveryDebounceTime);
  }
  public set recoveryDebounceTime(seconds: number) {
    PreferencesContainer.instance.recoveryDebounceTime = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Cooldown period between recovery attempts in seconds. */
  public get recoveryCooldown(): number {
    return fromMsToSec(PreferencesContainer.instance.recoveryCooldown);
  }
  public set recoveryCooldown(seconds: number) {
    PreferencesContainer.instance.recoveryCooldown = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Grace period before treating ICE 'disconnected' as failure, in seconds. */
  public get iceDisconnectedGracePeriod(): number {
    return fromMsToSec(PreferencesContainer.instance.iceDisconnectedGracePeriod);
  }
  public set iceDisconnectedGracePeriod(seconds: number) {
    PreferencesContainer.instance.iceDisconnectedGracePeriod = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Timeout for a single ICE restart attempt in seconds. */
  public get iceRestartTimeout(): number {
    return fromMsToSec(PreferencesContainer.instance.iceRestartTimeout);
  }
  public set iceRestartTimeout(seconds: number) {
    PreferencesContainer.instance.iceRestartTimeout = fromSecToMs(seconds);
    this._saveToStorage();
  }

  /** Maximum recovery attempts before giving up. */
  public get maxRecoveryAttempts(): number {
    return PreferencesContainer.instance.maxRecoveryAttempts;
  }
  public set maxRecoveryAttempts(value: number) {
    PreferencesContainer.instance.maxRecoveryAttempts = value;
    this._saveToStorage();
  }

  /** Whether relay-only escalation is enabled as a last-resort recovery tier. */
  public get enableRelayFallback(): boolean {
    return PreferencesContainer.instance.enableRelayFallback;
  }
  public set enableRelayFallback(value: boolean) {
    PreferencesContainer.instance.enableRelayFallback = value;
    this._saveToStorage();
  }

  /** Whether browser network change detection (online/offline) is enabled. */
  public get enableNetworkChangeDetection(): boolean {
    return PreferencesContainer.instance.enableNetworkChangeDetection;
  }
  public set enableNetworkChangeDetection(value: boolean) {
    PreferencesContainer.instance.enableNetworkChangeDetection = value;
    this._saveToStorage();
  }

  /** Whether server-sent media-timeout hangups are intercepted for recovery. */
  public get enableServerHangupInterception(): boolean {
    return PreferencesContainer.instance.enableServerHangupInterception;
  }
  public set enableServerHangupInterception(value: boolean) {
    PreferencesContainer.instance.enableServerHangupInterception = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Device management (Section 5)
  // ===========================================================================

  /** Whether device selections are persisted to storage. */
  public get persistDeviceSelection(): boolean {
    return PreferencesContainer.instance.persistDeviceSelection;
  }
  public set persistDeviceSelection(value: boolean) {
    PreferencesContainer.instance.persistDeviceSelection = value;
    this._saveToStorage();
  }

  /** Whether device changes are auto-applied to active calls. */
  public get syncDevicesToActiveCalls(): boolean {
    return PreferencesContainer.instance.syncDevicesToActiveCalls;
  }
  public set syncDevicesToActiveCalls(value: boolean) {
    PreferencesContainer.instance.syncDevicesToActiveCalls = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Visibility (Section 4)
  // ===========================================================================

  /** Whether to auto-mute video when the tab becomes hidden. */
  public get autoMuteVideoOnHidden(): boolean {
    return PreferencesContainer.instance.autoMuteVideoOnHidden;
  }
  public set autoMuteVideoOnHidden(value: boolean) {
    PreferencesContainer.instance.autoMuteVideoOnHidden = value;
    this._saveToStorage();
  }

  /** Whether to re-enumerate devices when the page becomes visible. */
  public get refreshDevicesOnVisible(): boolean {
    return PreferencesContainer.instance.refreshDevicesOnVisible;
  }
  public set refreshDevicesOnVisible(value: boolean) {
    PreferencesContainer.instance.refreshDevicesOnVisible = value;
    this._saveToStorage();
  }

  /** Whether to check peer connection health when the page becomes visible. */
  public get checkConnectionOnVisible(): boolean {
    return PreferencesContainer.instance.checkConnectionOnVisible;
  }
  public set checkConnectionOnVisible(value: boolean) {
    PreferencesContainer.instance.checkConnectionOnVisible = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Media defaults (Section 16.5 & 16.6)
  // ===========================================================================

  /** Default audio track constraints applied when no explicit constraints are provided. */
  public get defaultAudioConstraints(): MediaTrackConstraints | undefined {
    return PreferencesContainer.instance.defaultAudioConstraints;
  }
  public set defaultAudioConstraints(value: MediaTrackConstraints | undefined) {
    PreferencesContainer.instance.defaultAudioConstraints = value;
  }

  /** Default video track constraints applied when video is enabled without explicit constraints. */
  public get defaultVideoConstraints(): MediaTrackConstraints | undefined {
    return PreferencesContainer.instance.defaultVideoConstraints;
  }
  public set defaultVideoConstraints(value: MediaTrackConstraints | undefined) {
    PreferencesContainer.instance.defaultVideoConstraints = value;
  }

  /** Whether stereo Opus is enabled globally. */
  public get stereoAudio(): boolean {
    return PreferencesContainer.instance.stereoAudio;
  }
  public set stereoAudio(value: boolean) {
    PreferencesContainer.instance.stereoAudio = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Degradation (Section 22)
  // ===========================================================================

  /** Whether automatic video degradation on low bandwidth is enabled. */
  public get enableAutoDegradation(): boolean {
    return PreferencesContainer.instance.enableAutoDegradation;
  }
  public set enableAutoDegradation(value: boolean) {
    PreferencesContainer.instance.enableAutoDegradation = value;
    this._saveToStorage();
  }

  /** Bitrate in kbps below which video is automatically disabled. */
  public get degradationBitrateThreshold(): number {
    return PreferencesContainer.instance.degradationBitrateThreshold;
  }
  public set degradationBitrateThreshold(value: number) {
    PreferencesContainer.instance.degradationBitrateThreshold = value;
    this._saveToStorage();
  }

  /** Bitrate in kbps above which video is automatically re-enabled. */
  public get degradationRecoveryThreshold(): number {
    return PreferencesContainer.instance.degradationRecoveryThreshold;
  }
  public set degradationRecoveryThreshold(value: number) {
    PreferencesContainer.instance.degradationRecoveryThreshold = value;
    this._saveToStorage();
  }

  // ===========================================================================
  // Codec preferences (Section 23)
  // ===========================================================================

  /** Preferred video codecs in priority order. */
  public get preferredVideoCodecs(): string[] {
    return PreferencesContainer.instance.preferredVideoCodecs;
  }
  public set preferredVideoCodecs(value: string[]) {
    PreferencesContainer.instance.preferredVideoCodecs = value;
    this._saveToStorage();
  }

  /** Preferred audio codecs in priority order. */
  public get preferredAudioCodecs(): string[] {
    return PreferencesContainer.instance.preferredAudioCodecs;
  }
  public set preferredAudioCodecs(value: string[]) {
    PreferencesContainer.instance.preferredAudioCodecs = value;
    this._saveToStorage();
  }

  /** Saves current preferences to storage (fire-and-forget). */
  private _saveToStorage(): void {
    if (!this._storage) return;
    const data = collectStoredPreferences();
    this._storage.setItem(PREFERENCES_STORAGE_KEY, data, 'local').catch((error: unknown) => {
      logger.error(`[ClientPreferences] Failed to save preferences: ${String(error)}`);
    });
  }

  /** Loads preferences from storage and applies them to the container. */
  private _loadFromStorage(): void {
    if (!this._storage) return;
    this._storage
      .getItem<StoredPreferences>(PREFERENCES_STORAGE_KEY, 'local')
      .then((stored) => {
        if (stored) {
          applyStoredPreferences(stored);
        }
      })
      .catch((error: unknown) => {
        logger.error(`[ClientPreferences] Failed to load preferences: ${String(error)}`);
      });
  }
}
