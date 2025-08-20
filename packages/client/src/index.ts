/**
 * Welcome to the technical documentation for the SignalWire Client JavaScript SDK.
 * @module
 */

export {
  BaseComponentOptions,
  BaseConnectionState,
  ClientEvents,
  EmitterContract,
  RTCTrackEventName,
  UserOptions,
  SessionStatus,
  SessionEvents,
  VideoLayout,
  InternalVideoLayout,
  VideoPosition,
  VideoPositions,
  CallUpdatedEventParams,
  CallLeftEventParams,
  CallStateEventParams,
  CallPlayEventParams,
  CallConnectEventParams,
  ConversationMessageEventName,
  ConversationMessageEvent,
  ConversationEventParams,
  ConversationEvent,
  // EventEmitter,
  SetAudioFlagsParams,
  CallSessionEventParams,
  MemberJoinedEventParams,
  MemberUpdatedEventParams,
  MemberLeftEventParams,
  MemberTalkingEventParams,
  MemberEventParams,
  MemberEntity,
  InternalMemberEntity,
} from '@signalwire/core'

export {
  BaseConnectionOptions,
  ConnectionOptions,
  MicrophoneAnalyzer,
} from '@signalwire/webrtc'

export {
  CallJoinedEventParams,
  RoomSessionObjectEventsHandlerMap,
  RoomSessionObjectEvents,
  RoomEventNames,
  StartScreenShareOptions,
} from './utils/interfaces'

export { RoomSessionScreenShare } from './RoomSessionScreenShare'
export { RoomSessionDevice } from './RoomSessionDevice'
export {
  BaseRoomSession,
  BaseRoomSessionOptions,
  BaseRoomSessionConnection,
  BaseRoomSessionEvents,
  createBaseRoomSessionObject,
} from './BaseRoomSession'

/**
 * The WebRTC namespace includes functions that give you access to the input and
 * output media devices available on the user's machine. For example, you can
 * use these functions to request permission and get access to the media stream
 * from a webcam, from a microphone, or from a screen sharing.
 */
export * as WebRTC from './webrtc'

/**
 * Build Video Element
 */
export { buildVideoElement } from './buildVideoElement'
export { LocalVideoOverlay, OverlayMap, UserOverlay } from './VideoOverlays'

/**
 * Device Preference Management
 */
export { DeviceManager } from './device/DeviceManager'
export {
  DeviceType,
  DevicePreference,
  DeviceState,
  DeviceOptions,
  DevicePreferenceConfig,
  DeviceManagerEvents,
  DeviceManagerAPI,
  RecoveryStrategy,
  RecoveryResult,
  DevicePreferenceStorage,
  DeviceChangeEvent,
  DeviceChanges,
  DeviceMonitorEvents,
  RecoveryAttempt,
  RecoveryStatus,
  DeviceRecoveryEngineOptions,
  RecoveryStrategyDefinition,
  RecoveryStrategyResult,
  DeviceRecoveryEngineEvents,
} from './device/types'
export {
  LocalStorageAdapter,
  MemoryStorageAdapter,
  createStorageAdapter,
} from './device/DevicePreferenceStorage'
export { DeviceMonitor } from './device/DeviceMonitor'
export { DeviceRecoveryEngine } from './device/DeviceRecoveryEngine'

// Redux exports - temporarily commented out due to build issues
// export { default as deviceReducer } from './device/deviceSlice'
// export * from './device/deviceSlice'
// export * from './device/deviceSelectors'

// Redux integration helpers
// export * from './device/deviceReduxIntegration'

/**
 * Video namespace contains video room session functionality
 */
export * as Video from './video'