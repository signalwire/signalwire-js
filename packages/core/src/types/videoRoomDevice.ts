export type CameraUpdated = 'camera.updated'
export type CameraDisconnected = 'camera.disconnected'
export type MicrophoneUpdated = 'microphone.updated'
export type MicrophoneDisconnected = 'microphone.disconnected'
export type SpeakerUpdated = 'speaker.updated'
export type SpeakerDisconnected = 'speaker.disconnected'

/**
 * List of public event names
 */
export type VideoRoomDeviceEventNames =
  | CameraUpdated
  | CameraDisconnected
  | MicrophoneUpdated
  | MicrophoneDisconnected
  | SpeakerUpdated
  | SpeakerDisconnected

export type VideoRoomDeviceUpdatedEventNames =
  | CameraUpdated
  | MicrophoneUpdated
  | SpeakerUpdated

export type VideoRoomDeviceDisconnectedEventNames =
  | CameraDisconnected
  | MicrophoneDisconnected
  | SpeakerDisconnected

export interface MediaDeviceInfo
  extends Pick<MediaDeviceInfo, 'deviceId' | 'kind'> {}

export interface DeviceUpdatedEventParams {
  previous: MediaDeviceInfo
  current: MediaDeviceInfo
}

export type DeviceDisconnectedEventParams = MediaDeviceInfo

export type VideoRoomDeviceEventParams =
  | DeviceUpdatedEventParams
  | DeviceDisconnectedEventParams
