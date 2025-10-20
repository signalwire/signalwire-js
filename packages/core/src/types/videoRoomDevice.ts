export type CameraUpdated = 'camera.updated'
export type CameraDisconnected = 'camera.disconnected'
export type MicrophoneUpdated = 'microphone.updated'
export type MicrophoneDisconnected = 'microphone.disconnected'
export type SpeakerUpdated = 'speaker.updated'
export type SpeakerDisconnected = 'speaker.disconnected'

/**
 * List of public event names
 */

export type CallSessionDeviceUpdatedEventNames =
  | CameraUpdated
  | MicrophoneUpdated
  | SpeakerUpdated

export type CallSessionDeviceDisconnectedEventNames =
  | CameraDisconnected
  | MicrophoneDisconnected
  | SpeakerDisconnected

export type CallSessionDeviceEventNames =
  | CallSessionDeviceUpdatedEventNames
  | CallSessionDeviceDisconnectedEventNames

export interface VideoRoomMediaDeviceInfo {
  deviceId: MediaDeviceInfo['deviceId'] | undefined
  label: MediaDeviceInfo['label'] | undefined
}

export interface DeviceUpdatedEventParams {
  previous: VideoRoomMediaDeviceInfo
  current: VideoRoomMediaDeviceInfo
}

export type DeviceDisconnectedEventParams = VideoRoomMediaDeviceInfo

export type CallSessionDeviceEventParams =
  | DeviceUpdatedEventParams
  | DeviceDisconnectedEventParams
