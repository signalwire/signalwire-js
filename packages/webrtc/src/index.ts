export {
  getDevices,
  getCameraDevices,
  getMicrophoneDevices,
  getSpeakerDevices,
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
export * from './utils'
export * from './utils/interfaces'
export {
  BaseConnection,
  BaseConnectionOptions,
  BaseConnectionStateEventTypes,
} from './BaseConnection'
