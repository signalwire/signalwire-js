export {
  getDevices,
  getCameraDevices,
  getMicrophoneDevices,
  getSpeakerDevices,
  getSpeakerById,
  getDevicesWithPermissions,
  getCameraDevicesWithPermissions,
  getMicrophoneDevicesWithPermissions,
  getSpeakerDevicesWithPermissions,
  assureDeviceId,
  assureVideoDevice,
  assureAudioInDevice,
  assureAudioOutDevice,
  createDeviceWatcher,
  createMicrophoneDeviceWatcher,
  createSpeakerDeviceWatcher,
  createCameraDeviceWatcher,
  createMicrophoneAnalyzer,
} from './utils/deviceHelpers'
export type { MicrophoneAnalyzer } from './utils/deviceHelpers'
export {
  supportsMediaDevices,
  supportsGetUserMedia,
  supportsGetDisplayMedia,
  getUserMedia,
  getDisplayMedia,
  enumerateDevices,
  enumerateDevicesByKind,
  getSupportedConstraints,
  streamIsValid,
  supportsMediaOutput,
  setMediaElementSinkId,
  stopStream,
  stopTrack,
  checkPermissions,
  checkCameraPermissions,
  checkMicrophonePermissions,
  checkSpeakerPermissions,
  requestPermissions,
} from './utils'
export * from './utils/interfaces'
export { BaseConnection, BaseConnectionOptions } from './BaseConnection'
export { sessionConnectionPoolWorker } from './workers/sessionConnectionPoolWorker'
export { BaselineManager } from './monitoring/BaselineManager'
export type { BaselineComparison } from './monitoring/BaselineManager'
export { RecoveryManager } from './monitoring/RecoveryManager'
export { MetricsCollector } from './monitoring/MetricsCollector'
export type { MetricsCollectorOptions } from './monitoring/MetricsCollector'
export { WebRTCStatsMonitor } from './monitoring/WebRTCStatsMonitor'
export * from './monitoring/interfaces'
export * from './monitoring/constants'
export { IssueDetector } from './monitoring/IssueDetector'
export { 
  MONITORING_PRESETS, 
  QualityUtils, 
  createWebRTCStatsMonitor 
} from './monitoring'
