export const INVITE_VERSION = 1000;
export const DEFAULT_ICE_CANDIDATE_TIMEOUT_MS = 600;
export const DEFAULT_ICE_GATHERING_TIMEOUT_MS = 6_000;
export const DEFAULT_RECONNECT_CALLS_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_REATTACH_WAIT_TIMEOUT_MS = 10_000; // 10 seconds to wait for server verto.attach
export const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
export const DEFAULT_RECONNECT_DELAY_MIN_MS = 100;
export const DEFAULT_RECONNECT_DELAY_MAX_MS = 3000;
export const DEFAULT_DEVICE_DEBOUNCE_TIME_MS = 1500;
export const DEFAULT_DEVICE_POLLING_INTERVAL_MS = 0; // Disabled by default
export const PREFERENCES_STORAGE_KEY = 'sw:preferences';

/** Scope value that enables automatic token refresh. */
export const SAT_REFRESH_SCOPE = 'sat:refresh';

/** API endpoints for device token operations. */
export const DEVICE_TOKEN_ENDPOINT = '/api/fabric/subscriber/devices/token';
export const DEVICE_REFRESH_ENDPOINT = '/api/fabric/subscriber/devices/refresh';

/** Default device token TTL in seconds (15 minutes). */
export const DEVICE_TOKEN_DEFAULT_EXPIRE_IN = 900;

/** Buffer time in milliseconds before expiry to trigger refresh. */
export const DEVICE_TOKEN_REFRESH_BUFFER_MS = 30_000;

/** Maximum retry attempts for device token refresh on transient failure. */
export const DEVICE_TOKEN_REFRESH_MAX_RETRIES = 3;

/** Base delay in milliseconds for exponential backoff on refresh retry. */
export const DEVICE_TOKEN_REFRESH_RETRY_BASE_MS = 1000;

/** Maximum retry attempts for developer credential refresh on transient failure. */
export const CREDENTIAL_REFRESH_MAX_RETRIES = 5;

/** Base delay in milliseconds for exponential backoff on credential refresh retry. */
export const CREDENTIAL_REFRESH_RETRY_BASE_MS = 1000;

/** Maximum delay in milliseconds for credential refresh backoff. */
export const CREDENTIAL_REFRESH_MAX_DELAY_MS = 30_000;

/** Buffer in milliseconds before token expiry to trigger refresh. */
export const CREDENTIAL_REFRESH_BUFFER_MS = 5000;

/**
 * Maximum time the coordinator will wait for `DeviceTokenManager.activate()`
 * to resolve before treating the activation as failed and falling back to
 * the developer-provided refresh path. Prevents a wedged HTTP layer from
 * leaving the session with no active refresh mechanism.
 */
export const CREDENTIAL_ACTIVATE_TIMEOUT_MS = 30_000;

/** JSON-RPC error code for requester validation failure (corrupted auth state). */
export const RPC_ERROR_REQUESTER_VALIDATION_FAILED = -32003;

/** JSON-RPC error code for invalid params (e.g., missing authentication block). */
export const RPC_ERROR_INVALID_PARAMS = -32602;

/** JSON-RPC error code for authentication failure (invalid token, missing DPoP, etc.). */
export const RPC_ERROR_AUTHENTICATION_FAILED = -32002;

// =============================================================================
// STATS MONITORING DEFAULTS (Section 1)
// =============================================================================

/** Default polling interval for RTCPeerConnection.getStats() in milliseconds. */
export const DEFAULT_STATS_POLLING_INTERVAL_MS = 1000;

/** Number of initial samples used to build a baseline for spike detection. */
export const DEFAULT_STATS_BASELINE_SAMPLES = 10;

/** Duration in ms with no inbound audio packets before emitting a critical issue. */
export const DEFAULT_STATS_NO_PACKET_THRESHOLD_MS = 2000;

/** Multiplier applied to baseline RTT to detect a warning-level RTT spike. */
export const DEFAULT_STATS_RTT_SPIKE_MULTIPLIER = 3;

/** Packet loss fraction (0-1) above which a warning is emitted. */
export const DEFAULT_STATS_PACKET_LOSS_THRESHOLD = 0.05;

/** Multiplier applied to baseline jitter to detect a jitter spike. */
export const DEFAULT_STATS_JITTER_SPIKE_MULTIPLIER = 4;

/** Number of seconds of metrics history to retain. */
export const DEFAULT_STATS_HISTORY_SIZE = 30;

// =============================================================================
// KEYFRAME THROTTLING DEFAULTS (Section 2)
// =============================================================================

/** Maximum keyframe requests allowed within a single burst window. */
export const DEFAULT_KEYFRAME_MAX_BURST = 3;

/** Duration of the keyframe burst window in milliseconds. */
export const DEFAULT_KEYFRAME_BURST_WINDOW_MS = 3000;

/** Cooldown period in ms after burst limit is reached before allowing more keyframes. */
export const DEFAULT_KEYFRAME_COOLDOWN_MS = 10_000;

// =============================================================================
// RE-INVITE / ICE RESTART DEFAULTS (Section 2 & 19)
// =============================================================================

/** Minimum time between re-INVITE attempts in milliseconds. */
export const DEFAULT_REINVITE_DEBOUNCE_TIME_MS = 10_000;

/** Maximum number of re-INVITE attempts per call. */
export const DEFAULT_REINVITE_MAX_ATTEMPTS = 3;

/** Timeout for a single re-INVITE attempt in milliseconds. */
export const DEFAULT_REINVITE_TIMEOUT_MS = 5000;

// =============================================================================
// RECOVERY PIPELINE DEFAULTS (Section 19)
// =============================================================================

/** Debounce window in ms to collapse multiple detection signals into one trigger. */
export const DEFAULT_RECOVERY_DEBOUNCE_TIME_MS = 2000;

/** Cooldown period in ms between recovery attempts. */
export const DEFAULT_RECOVERY_COOLDOWN_MS = 10_000;

/** Grace period in ms before treating ICE 'disconnected' as a failure. */
export const DEFAULT_ICE_DISCONNECTED_GRACE_PERIOD_MS = 3000;

/** Timeout for a single ICE restart attempt in milliseconds. */
export const DEFAULT_ICE_RESTART_TIMEOUT_MS = 5000;

/** Maximum recovery attempts before emitting 'max_attempts_reached'. */
export const DEFAULT_MAX_RECOVERY_ATTEMPTS = 3;

/** Upper bound in ms for waiting on iceGatheringState === 'complete' after an ICE restart. */
export const ICE_GATHERING_COMPLETE_TIMEOUT_MS = 10_000;

/** Upper bound in ms for waiting on RTCPeerConnection.connectionState === 'connected' after a recovery ICE restart. */
export const PEER_CONNECTION_RECOVERY_WAIT_MS = 5000;

/** Polling interval in ms while waiting for RTCPeerConnection.connectionState to transition. */
export const PEER_CONNECTION_RECOVERY_POLL_MS = 100;

// =============================================================================
// AUDIO PIPELINE (local mic metering / gain / VAD)
// =============================================================================

/** Polling interval for LocalAudioPipeline.level$ (ms). ~30fps is smooth for meters. */
export const AUDIO_LEVEL_POLL_INTERVAL_MS = 33;

/** RMS level threshold (0..1) above which the local participant is considered speaking. */
export const VAD_THRESHOLD = 0.03;

/** Hold window in ms below the threshold before speaking$ flips back to false. */
export const VAD_HOLD_MS = 250;

// =============================================================================
// DEVICE MANAGEMENT DEFAULTS (Section 5)
// =============================================================================

/** Whether to persist device selections to storage by default. */
export const DEFAULT_PERSIST_DEVICE_SELECTION = true;

/** Whether to auto-apply device changes to active calls by default. */
export const DEFAULT_SYNC_DEVICES_TO_ACTIVE_CALLS = true;

/** Storage keys for persisted device selections. */
export const DEVICE_STORAGE_KEY_AUDIO_INPUT = 'sw:device:audioinput';
export const DEVICE_STORAGE_KEY_AUDIO_OUTPUT = 'sw:device:audiooutput';
export const DEVICE_STORAGE_KEY_VIDEO_INPUT = 'sw:device:videoinput';

/** SDK storage key prefix used for targeted cleanup (factory reset). */
export const SDK_STORAGE_KEY_PREFIX = 'sw:';

// =============================================================================
// VISIBILITY DEFAULTS (Section 4)
// =============================================================================

/** Whether to auto-mute video when the tab becomes hidden. */
export const DEFAULT_AUTO_MUTE_VIDEO_ON_HIDDEN = false;

/** Whether to re-enumerate devices when the page becomes visible. */
export const DEFAULT_REFRESH_DEVICES_ON_VISIBLE = true;

/** Whether to check peer connection health when the page becomes visible. */
export const DEFAULT_CHECK_CONNECTION_ON_VISIBLE = true;

// =============================================================================
// DEGRADATION THRESHOLDS (Section 22)
// =============================================================================

/** Whether automatic video degradation on low bandwidth is enabled. */
export const DEFAULT_ENABLE_AUTO_DEGRADATION = true;

/** Bitrate in kbps below which video is automatically disabled. */
export const DEFAULT_DEGRADATION_BITRATE_THRESHOLD_KBPS = 150;

/** Bitrate in kbps above which video is automatically re-enabled (hysteresis). */
export const DEFAULT_DEGRADATION_RECOVERY_THRESHOLD_KBPS = 300;

// =============================================================================
// NETWORK RECOVERY FEATURE FLAGS (Section 19)
// =============================================================================

/** Whether relay-only escalation is enabled as a last-resort recovery tier. */
export const DEFAULT_ENABLE_RELAY_FALLBACK = true;

/** Whether to listen for browser online/offline/connection events. */
export const DEFAULT_ENABLE_NETWORK_CHANGE_DETECTION = true;

/** Whether to intercept server-sent media-timeout hangups and attempt recovery. */
export const DEFAULT_ENABLE_SERVER_HANGUP_INTERCEPTION = true;

// =============================================================================
// DEFAULT AUDIO/VIDEO CONSTRAINTS (Section 16.5 & 16.6)
// =============================================================================

/** Default audio track constraints applied when no explicit constraints are provided. */
export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

/** Default video track constraints applied when video is enabled without explicit constraints. */
export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  aspectRatio: 16 / 9
};

/** Whether stereo Opus is enabled by default. */
export const DEFAULT_STEREO_AUDIO = false;

/** Max average bitrate for stereo Opus in bits per second. */
export const DEFAULT_STEREO_MAX_AVERAGE_BITRATE = 510_000;

// =============================================================================
// QUALITY LEVEL THRESHOLDS (Section 21)
// =============================================================================

/** MOS score threshold: at or above this is 'excellent'. */
export const QUALITY_THRESHOLD_EXCELLENT = 4.0;

/** MOS score threshold: at or above this is 'good'. */
export const QUALITY_THRESHOLD_GOOD = 3.5;

/** MOS score threshold: at or above this is 'fair'. */
export const QUALITY_THRESHOLD_FAIR = 3.0;

/** MOS score threshold: at or above this is 'poor'. */
export const QUALITY_THRESHOLD_POOR = 2.0;

/** MOS score at or below QUALITY_THRESHOLD_POOR is 'critical'. */

// =============================================================================
// PREFLIGHT DEFAULTS (Section 20)
// =============================================================================

/** Default duration for the preflight media/bandwidth test in seconds. */
export const DEFAULT_PREFLIGHT_DURATION_SEC = 10;
