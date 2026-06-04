/**
 * Types for SDK resilience, recovery, diagnostics, and quality monitoring.
 *
 * These types support:
 * - WebRTC stats monitoring (Section 1)
 * - Tiered recovery system (Section 2)
 * - Device recovery events (Section 5)
 * - Tab visibility handling (Section 4)
 * - Audio/video constraint management (Section 16)
 * - Network resilience & recovery pipeline (Section 19)
 * - Preflight connectivity test (Section 20)
 * - Call quality score (Section 21)
 * - Graceful degradation (Section 22)
 * - Platform capability detection (Section 24)
 * - Structured diagnostic log export (Section 26)
 */

// =============================================================================
// QUALITY LEVEL
// =============================================================================

/** Simplified quality level for UI indicators, derived from MOS score. */
export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// =============================================================================
// CALL STATUS EXTENSION
// =============================================================================

/**
 * Extended call status that includes the 'recovering' state.
 *
 * Used when the SDK is attempting to recover a call after a network
 * disruption or media failure.
 */
export type ResilienceCallStatus =
  | 'new'
  | 'trying'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'recovering'
  | 'disconnecting'
  | 'disconnected'
  | 'failed'
  | 'destroyed';

// =============================================================================
// NETWORK MONITORING (Section 1)
// =============================================================================

/**
 * Re-export canonical types from RTCStatsMonitor.
 *
 * These are the shapes actually emitted at runtime. Keeping a single
 * source of truth avoids type/runtime mismatches (audit issues 1, 5).
 */
import type {
  NetworkIssue as _NetworkIssue,
  NetworkMetrics as _NetworkMetrics
} from '../../controllers/RTCStatsMonitor';

export type { _NetworkIssue as NetworkIssue, _NetworkMetrics as NetworkMetrics };

// Local alias for use within this file
type NetworkMetrics = _NetworkMetrics;

// =============================================================================
// RECOVERY SYSTEM (Section 2 & 19)
// =============================================================================

/** Event emitted when a recovery action is taken on a call. */
export interface RecoveryEvent {
  /** The recovery action that was taken. */
  readonly action:
    | 'keyframe_requested'
    | 'reinvite_started'
    | 'reinvite_succeeded'
    | 'reinvite_failed'
    | 'reinvite_timeout'
    | 'max_attempts_reached'
    | 'call_recovering'
    | 'call_recovered'
    | 'call_recovery_failed'
    | 'signal_reconnect'
    | 'full_reconnect'
    | 'video_disabled'
    | 'video_restored';
  /** Human-readable description of why recovery was triggered. */
  readonly reason: string;
  /** Current attempt number (for multi-attempt recoveries). */
  readonly attempt?: number;
  /** Maximum number of attempts allowed. */
  readonly maxAttempts?: number;
  /** Timestamp when the event occurred (epoch ms). */
  readonly timestamp: number;
}

/** State of the recovery pipeline state machine (Section 19.7). */
export type RecoveryState = 'idle' | 'debouncing' | 'recovering' | 'cooldown';

// =============================================================================
// DEVICE MANAGEMENT (Section 5)
// =============================================================================

/** Event emitted when the SDK auto-switches a device. */
export interface DeviceRecoveryEvent {
  /** The kind of device that was switched. */
  readonly kind: 'audioinput' | 'audiooutput' | 'videoinput';
  /** The device that was previously selected (null if none). */
  readonly previousDevice: MediaDeviceInfo | null;
  /** The device that was selected as a replacement (null if none available). */
  readonly newDevice: MediaDeviceInfo | null;
  /** The reason for the device switch. */
  readonly reason:
    | 'device_disconnected'
    | 'device_reconnected'
    | 'session_restored'
    | 'fallback_to_default'
    | 'default_changed'
    | 'ambiguous_match';
}

/**
 * Serializable subset of MediaDeviceInfo for persistence.
 *
 * The browser's MediaDeviceInfo interface is not serializable.
 * This stores the fields needed for device recovery across sessions.
 */
export interface StoredDevicePreference {
  /** The device ID. */
  readonly deviceId: string;
  /** The human-readable label. */
  readonly label: string;
  /** The device kind. */
  readonly kind: MediaDeviceKind;
  /** The group ID (identifies the physical device). */
  readonly groupId: string;
}

/** Result of a media permissions request (Section 5.10). */
export interface PermissionResult {
  /** Whether audio permission was granted. */
  readonly audio: boolean;
  /** Whether video permission was granted. */
  readonly video: boolean;
  /** The audio device the user selected in the browser picker, if any. */
  readonly selectedAudioDevice?: MediaDeviceInfo;
  /** The video device the user selected in the browser picker, if any. */
  readonly selectedVideoDevice?: MediaDeviceInfo;
}

/** Event emitted when getUserMedia falls back to looser constraints. */
export interface ConstraintFallbackEvent {
  /** The kind of input device. */
  readonly kind: 'audioinput' | 'videoinput';
  /** The device that was originally requested. */
  readonly requestedDevice: MediaDeviceInfo | null;
  /** The device that the browser actually provided. */
  readonly actualDevice: MediaDeviceInfo | null;
  /** The constraint level that succeeded. */
  readonly fallbackLevel: 'exact' | 'preferred' | 'default';
}

// =============================================================================
// PLATFORM CAPABILITIES (Section 24)
// =============================================================================

/** Browser/platform WebRTC capability flags. */
export interface PlatformCapabilities {
  /** Whether screen sharing is supported. */
  readonly screenShare: boolean;
  /** Whether screen share can include system audio (Chrome-only). */
  readonly screenShareAudio: boolean;
  /** Whether simulcast is supported. */
  readonly simulcast: boolean;
  /** Whether insertable streams / encoded transforms are available. */
  readonly insertableStreams: boolean;
  /** Whether setSinkId (audio output selection) is supported. */
  readonly audioOutputSelection: boolean;
  /** List of supported video codecs. */
  readonly videoCodecs: readonly string[];
  /** List of supported audio codecs. */
  readonly audioCodecs: readonly string[];
  /** Whether the browser supports WebRTC at all. */
  readonly webrtc: boolean;
  /** Whether getUserMedia is available. */
  readonly getUserMedia: boolean;
  /** Whether getDisplayMedia is available. */
  readonly getDisplayMedia: boolean;
}

// =============================================================================
// PREFLIGHT TEST (Section 20)
// =============================================================================

/** Options for the preflight connectivity test. */
export interface PreflightOptions {
  /** How long to run the media test in seconds (default: 10). */
  readonly duration?: number;
  /** Skip the media/bandwidth test, only test signaling + TURN + devices. */
  readonly skipMediaTest?: boolean;
  /** Test a specific audio device instead of the currently selected one. */
  readonly audioDevice?: MediaDeviceInfo;
  /** Test a specific video device instead of the currently selected one. */
  readonly videoDevice?: MediaDeviceInfo;
}

/** Results of a preflight connectivity test. */
export interface PreflightResult {
  /** Overall pass/fail. */
  readonly ok: boolean;
  /** Signaling server reachability. */
  readonly signaling: {
    readonly reachable: boolean;
    readonly rttMs: number;
  };
  /** ICE/TURN connectivity. */
  readonly connectivity: {
    /** 'direct' = host/srflx worked, 'relay' = only TURN relay, 'failed' = nothing. */
    readonly type: 'direct' | 'relay' | 'failed';
    /** Whether TURN servers are reachable. */
    readonly turnReachable: boolean;
    /** Whether STUN servers are reachable. */
    readonly stunReachable: boolean;
    /** RTT to media server in ms. */
    readonly rttMs: number;
  };
  /** Bandwidth estimation (null if skipMediaTest). */
  readonly bandwidth: {
    readonly uploadKbps: number;
    readonly downloadKbps: number;
  } | null;
  /** Device test results. */
  readonly devices: {
    readonly audioInput: { readonly working: boolean; readonly device: MediaDeviceInfo | null };
    readonly videoInput: { readonly working: boolean; readonly device: MediaDeviceInfo | null };
    readonly audioOutput: { readonly available: boolean; readonly device: MediaDeviceInfo | null };
  };
  /** Human-readable warnings. */
  readonly warnings: readonly string[];
}

// =============================================================================
// AUDIO CONSTRAINTS (Section 16)
// =============================================================================

/** Event emitted when audio constraints change on a call. */
export interface AudioConstraintsEvent {
  /** The new constraints applied. */
  readonly constraints: MediaTrackConstraints;
  /** How the constraints were applied. */
  readonly method: 'applyConstraints' | 'trackReplacement';
  /** Timestamp when the event occurred (epoch ms). */
  readonly timestamp: number;
}

/** Event emitted when server-pushed media params are applied. */
export interface MediaParamsEvent {
  /** Audio constraints pushed by the server, if any. */
  readonly audio?: MediaTrackConstraints;
  /** Video constraints pushed by the server, if any. */
  readonly video?: MediaTrackConstraints;
  /** Timestamp when the event occurred (epoch ms). */
  readonly timestamp: number;
}

// =============================================================================
// DIAGNOSTICS (Section 26)
// =============================================================================

/** Structured diagnostic bundle for a session. */
export interface SessionDiagnostics {
  /** SDK version. */
  readonly sdkVersion: string;
  /** Browser/platform user agent string. */
  readonly userAgent: string;
  /** Platform capabilities detected at construction time. */
  readonly capabilities: PlatformCapabilities;
  /** Timeline of significant events during the session. */
  readonly events: readonly DiagnosticEvent[];
  /** Quality summary per call. */
  readonly calls: readonly CallDiagnosticSummary[];
  /** Device changes that occurred during the session. */
  readonly deviceChanges: readonly DeviceRecoveryEvent[];
  /** Current device list snapshot. */
  readonly devices: {
    readonly audioInput: readonly MediaDeviceInfo[];
    readonly audioOutput: readonly MediaDeviceInfo[];
    readonly videoInput: readonly MediaDeviceInfo[];
  };
}

/** A single diagnostic event in the session timeline. */
export interface DiagnosticEvent {
  /** Timestamp when the event occurred (epoch ms). */
  readonly timestamp: number;
  /** Category of the event. */
  readonly category: 'connection' | 'call' | 'device' | 'recovery' | 'error';
  /** Event description string. */
  readonly event: string;
  /** Additional details about the event. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Quality summary for a single call in the diagnostic bundle. */
export interface CallDiagnosticSummary {
  /** Unique call ID. */
  readonly callId: string;
  /** Whether the call was inbound or outbound. */
  readonly direction: 'inbound' | 'outbound';
  /** The destination dialed, if outbound. */
  readonly destination?: string;
  /** Total call duration in seconds. */
  readonly duration: number;
  /** Final call status. */
  readonly status: string;
  /** Average MOS quality score over the call. */
  readonly avgQualityScore: number;
  /** Worst (minimum) MOS quality score during the call. */
  readonly minQualityScore: number;
  /** Number of recovery attempts made during the call. */
  readonly recoveryAttempts: number;
  /** ICE candidate types that were used. */
  readonly iceCandidateTypes: readonly string[];
  /** Final network metrics snapshot at call end. */
  readonly finalMetrics: NetworkMetrics;
}
