import {
  RTCPeerConnection as RNRTCPeerConnection,
  mediaDevices as RNmediaDevices,
  MediaStream as RNMediaStream,
  // @ts-ignore
} from 'react-native-webrtc'

export const RTCPeerConnection = (config: RTCConfiguration) => {
  const _config = Object.keys(config)?.length ? config : null
  return new RNRTCPeerConnection(_config)
}

/**
 * Returns whether the current environment supports the media devices API.
 */
export const supportsMediaDevices = () => {
  return !!RNmediaDevices
}

/**
 * Returns the mediaDevices object if supported, otherwise throws an error.
 */
export const getMediaDevicesApi = () => {
  if (!supportsMediaDevices()) {
    throw new Error("The media devices API isn't supported in this environment")
  }

  return RNmediaDevices
}

/**
 * Returns whether the current environment supports `getUserMedia`.
 */
export const supportsGetUserMedia = () => {
  return typeof getMediaDevicesApi().getUserMedia === 'function'
}

/**
 * Returns whether the current environment supports `getDisplayMedia`.
 */
export const supportsGetDisplayMedia = () => {
  return typeof getMediaDevicesApi().getDisplayMedia === 'function'
}

/**
 * Returns a dictionary whose fields specify the constrainable properties the user agent understands.
 * Not supported on React Native
 */
export const getSupportedConstraints = () => ({})

export const streamIsValid = (stream: RNMediaStream) =>
  stream && stream instanceof RNMediaStream

/**
 * Returns whether the current environment supports the selection of a media output device.
 * Not supported in React Native.
 */
export const supportsMediaOutput = () => {
  return false
}

export const setMediaElementSinkId = (
  _htmlElementId: string,
  _deviceId: string
): Promise<boolean> => Promise.resolve(false)

export const sdpToJsonHack = (sdp: any) => {
  Object.defineProperty(sdp, 'toJSON', { value: () => sdp })
  return sdp
}

export const stopStream = (stream: RNMediaStream) => {
  if (streamIsValid(stream)) {
    stream?.getTracks()?.forEach(stopTrack)
  }
  stream = null
}

/**
 * This class in implemented by `react-native-webrtc` but
 * it's not exported directly. To avoid dealing with manual
 * file imports and having (potential) issues of mixing
 * commonjs/esm we ported it here since it's just a few
 * lines of code.
 */
class MediaStreamTrackEvent {
  type: string
  track: any
  constructor(type: string, eventInitDict: { track: any }) {
    this.type = type.toString()
    this.track = eventInitDict.track
  }
}

export const stopTrack = (track: MediaStreamTrack) => {
  if (track && track.readyState === 'live') {
    track.stop()
    track.dispatchEvent(
      // @ts-expect-error
      new MediaStreamTrackEvent('ended', { track })
    )
  }
}

// DevicePermissionDescriptor['name]
export type DevicePermissionName = 'camera' | 'microphone' | 'speaker'

/**
 * Maps permission's names from `DevicePermissionDescriptor["name"]`
 * to `MediaDeviceKind`
 */
const PERMISSIONS_MAPPING: Record<DevicePermissionName, MediaDeviceKind> = {
  camera: 'videoinput',
  microphone: 'audioinput',
  speaker: 'audiooutput',
}

export const _getMediaDeviceKindByName = (name?: DevicePermissionName) => {
  if (!name) {
    return undefined
  }

  return PERMISSIONS_MAPPING[name]
}
