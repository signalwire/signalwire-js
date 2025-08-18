/**
 * Type definitions for the visibility lifecycle management feature
 */

/**
 * Visibility state information from the Page Visibility API
 */
export interface VisibilityState {
  /** Whether the document is hidden */
  hidden: boolean
  /** The visibility state from document.visibilityState */
  visibilityState: DocumentVisibilityState
  /** Timestamp when the state was detected */
  timestamp: number
}

/**
 * Focus state information
 */
export interface FocusState {
  /** Whether the window currently has focus */
  hasFocus: boolean
  /** Timestamp when the focus state changed */
  timestamp: number
  /** Duration the window was without focus (if regaining focus) */
  blurDuration?: number
}

/**
 * Page show/hide state information
 */
export interface PageTransitionState {
  /** Whether the page was persisted in cache */
  persisted: boolean
  /** Timestamp when the event occurred */
  timestamp: number
}

/**
 * Mobile context detection
 */
export interface MobileContext {
  /** Whether this is a mobile device */
  isMobile: boolean
  /** Whether this is iOS */
  isIOS: boolean
  /** Whether this is Android */
  isAndroid: boolean
  /** Browser engine type */
  browserEngine: 'webkit' | 'blink' | 'gecko'
}

/**
 * Media state snapshot for preservation across visibility changes
 */
export interface MediaStateSnapshot {
  /** Timestamp of the snapshot */
  timestamp: number
  /** Video state */
  video: {
    enabled: boolean
    muted: boolean
    deviceId: string | null
    constraints: MediaTrackConstraints
  }
  /** Audio state */
  audio: {
    enabled: boolean
    muted: boolean
    deviceId: string | null
    constraints: MediaTrackConstraints
  }
  /** Screen sharing state */
  screen: {
    sharing: boolean
    audio: boolean
  }
  /** Auto-muted flags for restoration */
  autoMuted: {
    video: boolean
    audio: boolean
  }
}

/**
 * Recovery strategy enumeration
 */
export enum RecoveryStrategy {
  VideoPlay = 'VideoPlay',               // Try video element play() method
  KeyframeRequest = 'KeyframeRequest',   // Request new I-frame via PLI
  StreamReconnection = 'StreamReconnection', // Reconnect local stream
  Reinvite = 'Reinvite',                 // Full renegotiation
  LayoutRefresh = 'LayoutRefresh',       // Refresh video layout (Video SDK)
  CallFabricResume = 'CallFabricResume', // Resume Call Fabric connection
}

/**
 * Recovery status information
 */
export interface RecoveryStatus {
  /** Whether recovery is currently in progress */
  inProgress: boolean
  /** Last recovery attempt timestamp */
  lastAttempt: number | null
  /** Last successful recovery timestamp */
  lastSuccess: number | null
  /** Last used strategy that succeeded */
  lastSuccessStrategy: RecoveryStrategy | null
  /** Count of failed attempts */
  failureCount: number
}

/**
 * Device change information
 */
export interface DeviceChangeInfo {
  /** Devices that were added */
  added: MediaDeviceInfo[]
  /** Devices that were removed */
  removed: MediaDeviceInfo[]
  /** All current devices */
  current: MediaDeviceInfo[]
}

/**
 * Visibility event types
 */
export type VisibilityEventType = 
  | 'visibility'
  | 'focus' 
  | 'blur'
  | 'pageshow'
  | 'pagehide'
  | 'devicechange'
  | 'wake';

/**
 * Base visibility event structure
 */
export interface BaseVisibilityEvent {
  type: VisibilityEventType
  timestamp: number
}

/**
 * Visibility change event
 */
export interface VisibilityChangeEvent extends BaseVisibilityEvent {
  type: 'visibility'
  state: VisibilityState
}

/**
 * Focus gained event
 */
export interface FocusGainedEvent extends BaseVisibilityEvent {
  type: 'focus'
  wasHidden: boolean
  hiddenDuration: number
}

/**
 * Focus lost event
 */
export interface FocusLostEvent extends BaseVisibilityEvent {
  type: 'blur'
  autoMuted: boolean
}

/**
 * Page show event
 */
export interface PageShowEvent extends BaseVisibilityEvent {
  type: 'pageshow'
  persisted: boolean
}

/**
 * Page hide event
 */
export interface PageHideEvent extends BaseVisibilityEvent {
  type: 'pagehide' 
  persisted: boolean
}

/**
 * Device change event
 */
export interface DeviceChangeEvent extends BaseVisibilityEvent {
  type: 'devicechange'
  changes: DeviceChangeInfo
}

/**
 * Device wake detection event
 */
export interface DeviceWakeEvent extends BaseVisibilityEvent {
  type: 'wake'
  sleepDuration: number
}

/**
 * Union type for all visibility events
 */
export type VisibilityEvent = 
  | VisibilityChangeEvent
  | FocusGainedEvent
  | FocusLostEvent
  | PageShowEvent
  | PageHideEvent
  | DeviceChangeEvent
  | DeviceWakeEvent;

/**
 * Visibility configuration interface
 */
export interface VisibilityConfig {
  /** Enable/disable the visibility management feature */
  enabled: boolean

  /** Mobile-specific options */
  mobile: {
    /** Auto-mute video when losing focus on mobile */
    autoMuteVideo: boolean
    /** Auto-restore video when regaining focus on mobile */
    autoRestoreVideo: boolean
    /** Send DTMF notifications to server on mobile state changes */
    notifyServer: boolean
  }

  /** Recovery strategy configuration */
  recovery: {
    /** Recovery strategies to attempt in order */
    strategies: RecoveryStrategy[]
    /** Maximum attempts per strategy */
    maxAttempts: number
    /** Delay between recovery attempts in milliseconds */
    delayBetweenAttempts: number
  }

  /** Device management configuration */
  devices: {
    /** Re-enumerate devices when regaining focus */
    reEnumerateOnFocus: boolean
    /** Polling interval for device changes in milliseconds */
    pollingInterval: number
    /** Restore device preferences after wake */
    restorePreferences: boolean
  }

  /** Background throttling configuration */
  throttling: {
    /** Time threshold before considering tab backgrounded in milliseconds */
    backgroundThreshold: number
    /** Delay before starting recovery in milliseconds */
    resumeDelay: number
  }
}

/**
 * Default visibility configuration
 */
export const DEFAULT_VISIBILITY_CONFIG: VisibilityConfig = {
  enabled: true,
  mobile: {
    autoMuteVideo: true,
    autoRestoreVideo: true,
    notifyServer: true,
  },
  recovery: {
    strategies: [
      RecoveryStrategy.VideoPlay,
      RecoveryStrategy.KeyframeRequest,
      RecoveryStrategy.StreamReconnection,
      RecoveryStrategy.Reinvite,
    ],
    maxAttempts: 3,
    delayBetweenAttempts: 1000,
  },
  devices: {
    reEnumerateOnFocus: true,
    pollingInterval: 3000,
    restorePreferences: true,
  },
  throttling: {
    backgroundThreshold: 30000,
    resumeDelay: 200,
  },
}

/**
 * Visibility manager events that can be emitted
 */
export interface VisibilityManagerEvents {
  // Visibility state changes
  'visibility.changed': (params: {
    state: 'visible' | 'hidden'
    timestamp: number
  }) => void

  // Focus events
  'visibility.focus.gained': (params: {
    wasHidden: boolean
    hiddenDuration: number
  }) => void

  'visibility.focus.lost': (params: { 
    autoMuted: boolean 
  }) => void

  // Recovery events
  'visibility.recovery.started': (params: {
    reason: string
    strategies: string[]
  }) => void

  'visibility.recovery.success': (params: {
    strategy: string
    duration: number
  }) => void

  'visibility.recovery.failed': (params: {
    strategies: string[]
    errors: Error[]
  }) => void

  // Device events
  'visibility.devices.changed': (params: {
    added: MediaDeviceInfo[]
    removed: MediaDeviceInfo[]
  }) => void
}

/**
 * Visibility API interface for public methods
 */
export interface VisibilityAPI {
  // Manual control
  pauseForBackground(): Promise<void>
  resumeFromBackground(): Promise<void>

  // State queries
  isBackgrounded(): boolean
  getVisibilityState(): VisibilityState
  getBackgroundDuration(): number

  // Configuration
  updateVisibilityConfig(config: Partial<VisibilityConfig>): void
  getVisibilityConfig(): VisibilityConfig

  // Recovery
  triggerManualRecovery(): Promise<boolean>
  getRecoveryStatus(): RecoveryStatus
}