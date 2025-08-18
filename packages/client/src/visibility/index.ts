/**
 * Visibility Lifecycle Management
 * 
 * This module provides intelligent handling of browser visibility changes,
 * tab focus events, and device wake scenarios to ensure optimal WebRTC
 * performance and resource utilization.
 */

// Main manager class
export { VisibilityManager } from './VisibilityManager'

// Type definitions
export type {
  VisibilityState,
  FocusState,
  PageTransitionState,
  MobileContext,
  MediaStateSnapshot,
  DeviceChangeInfo,
  VisibilityEventType,
  BaseVisibilityEvent,
  VisibilityChangeEvent,
  FocusGainedEvent,
  FocusLostEvent,
  PageShowEvent,
  PageHideEvent,
  DeviceChangeEvent,
  DeviceWakeEvent,
  VisibilityEvent,
  VisibilityConfig,
  VisibilityManagerEvents,
  VisibilityAPI,
  RecoveryStatus,
} from './types'

// Enums
export { RecoveryStrategy } from './types'

// Constants
export { DEFAULT_VISIBILITY_CONFIG } from './types'

// Event channel utilities
export {
  createVisibilityChannel,
  createDeviceChangeChannel,
  createCombinedVisibilityChannel,
  detectMobileContext,
  detectDeviceChanges,
  checkVisibilityAPISupport,
  getCurrentVisibilityState,
  getCurrentFocusState,
} from './eventChannel'

// Recovery strategies
export {
  executeVideoPlayRecovery,
  executeKeyframeRequestRecovery,
  executeStreamReconnectionRecovery,
  executeReinviteRecovery,
  executeRecoveryStrategies,
  needsVideoRecovery,
  getVideoStatus,
} from './recoveryStrategies'

export type {
  RecoveryResult,
  RecoveryOptions,
} from './recoveryStrategies'

// Mobile optimizations
export {
  MobileOptimizationManager,
  MobileAutoMuteStrategy,
  MobileWakeDetector,
  MobileRecoveryStrategy,
  MobileDTMFNotifier,
  detectExtendedMobileContext,
} from './mobileOptimization'

export type {
  ExtendedMobileContext,
  MobileMediaState,
  PlatformRecoveryConfig,
} from './mobileOptimization'

// Device management
export {
  DeviceManager,
  deviceManagementWorker,
  createDeviceManager,
  isDeviceManagementSupported,
  getDeviceManagementCapabilities,
} from './deviceManagement'

export type {
  DevicePreferences,
  DeviceChangeResult,
  DeviceRecoveryResult,
  DeviceManagementTarget,
} from './deviceManagement'