import {
  RTCPeerConnection as RNRTCPeerConnection,
  mediaDevices as RNmediaDevices,
  MediaStream as RNMediaStream,
  // @ts-ignore
} from 'react-native-webrtc'
import { objEmpty } from '../helpers'

export const RTCPeerConnection = (config: RTCConfiguration) => {
  const _config = objEmpty(config) ? null : config
  return new RNRTCPeerConnection(_config)
}

export const getUserMedia = (constraints: MediaStreamConstraints) => {
  return RNmediaDevices.getUserMedia(constraints)
}

export const enumerateDevices = () => RNmediaDevices.enumerateDevices()

export const enumerateDevicesByKind = async (filterByKind: string = null) => {
  let devices: MediaDeviceInfo[] = await enumerateDevices().catch((error) => [])
  if (filterByKind) {
    devices = devices.filter(({ kind }) => kind === filterByKind)
  }
  return devices
}

export const streamIsValid = (stream: RNMediaStream) =>
  stream && stream instanceof RNMediaStream

export const getSupportedConstraints = () => ({})

export const detachMediaStream = (htmlElementId: string) => null

export const setMediaElementSinkId = (
  htmlElementId: string,
  deviceId: string
): Promise<boolean> => Promise.resolve(false)

export const sdpToJsonHack = (sdp) => {
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

export const getHostname = () => null

export const buildVideoElementByTrack = (
  videoTrack: MediaStreamTrack,
  streamIds: string[] = []
) => null

export const buildAudioElementByTrack = (
  audioTrack: MediaStreamTrack,
  streamIds: string[] = []
) => null
