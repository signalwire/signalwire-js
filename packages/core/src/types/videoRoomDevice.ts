export type CameraUpdated = 'camera.updated'
export type CameraConstraintsUpdated = 'camera.constraints.updated'
export type CameraDisconnected = 'camera.disconnected'
export type MicrophoneUpdated = 'microphone.updated'
export type MicrophoneConstraintsUpdated = 'microphone.constraints.updated'
export type MicrophoneDisconnected = 'microphone.disconnected'
export type SpeakerUpdated = 'speaker.updated'
export type SpeakerDisconnected = 'speaker.disconnected'

/**
 * List of public event names
 */

export type VideoRoomDeviceUpdatedEventNames =
  | CameraUpdated
  | MicrophoneUpdated
  | SpeakerUpdated

export type VideoRoomDeviceConstraintsUpdatedEventNames =
  | CameraConstraintsUpdated
  | MicrophoneConstraintsUpdated

export type VideoRoomDeviceDisconnectedEventNames =
  | CameraDisconnected
  | MicrophoneDisconnected
  | SpeakerDisconnected

export type VideoRoomDeviceEventNames =
  | VideoRoomDeviceUpdatedEventNames
  | VideoRoomDeviceConstraintsUpdatedEventNames
  | VideoRoomDeviceDisconnectedEventNames

export interface VideoRoomMediaDeviceInfo {
  deviceId: MediaTrackConstraintSet['deviceId']
  label: MediaDeviceInfo['label'] | undefined
}

export interface DeviceUpdatedEventParams {
  previous: VideoRoomMediaDeviceInfo
  current: VideoRoomMediaDeviceInfo
}

export interface MediaDeviceIdentifiers {
  deviceId: MediaTrackConstraintSet['deviceId']
  kind: string
  label: string
}
export interface DeviceConstraintsUpdatedEventParams {
  kind: string
  previous: MediaDeviceIdentifiers | undefined
  current: MediaDeviceIdentifiers
  constraints: MediaTrackConstraints
}

export type DeviceDisconnectedEventParams = VideoRoomMediaDeviceInfo

export type VideoRoomDeviceEventParams =
  | DeviceUpdatedEventParams
  | DeviceDisconnectedEventParams
  | DeviceConstraintsUpdatedEventParams
