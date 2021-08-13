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

export const getUserMedia = (constraints: MediaStreamConstraints) => {
  return RNmediaDevices.getUserMedia(constraints)
}

export const getDisplayMedia = (constraints: MediaStreamConstraints) => {
  return RNmediaDevices.getDisplayMedia(constraints)
}

export const supportsGetUserMedia = () => {
  return typeof RNmediaDevices?.getUserMedia === 'function'
}

export const supportsGetDisplayMedia = () => {
  return typeof RNmediaDevices?.getDisplayMedia === 'function'
}

export const enumerateDevices = () => RNmediaDevices.enumerateDevices()

export const enumerateDevicesByKind = async (filterByKind: string) => {
  let devices: MediaDeviceInfo[] = await enumerateDevices().catch(
    (_error: any) => []
  )
  if (filterByKind) {
    devices = devices.filter(({ kind }) => kind === filterByKind)
  }
  return devices
}

export const streamIsValid = (stream: RNMediaStream) =>
  stream && stream instanceof RNMediaStream

export const getSupportedConstraints = () => ({})

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
    stream.getTracks().forEach(stopTrack)
  }
  stream = null
}

export const stopTrack = (track: MediaStreamTrack) => {
  if (track && track.readyState === 'live') {
    track.stop()
    track.dispatchEvent(new Event('ended'))
  }
}
