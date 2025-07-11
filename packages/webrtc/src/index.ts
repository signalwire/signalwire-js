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
