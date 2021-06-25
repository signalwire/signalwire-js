import { logger } from '@signalwire/core'
import * as WebRTC from './webrtcHelpers'
import { assureDeviceId } from './deviceHelpers'
import { ConnectionOptions } from './interfaces'

export const getUserMedia = async (constraints: MediaStreamConstraints) => {
  logger.info('RTCService.getUserMedia', constraints)
  const { audio, video } = constraints
  if (!audio && !video) {
    return
  }
  try {
    return await WebRTC.getUserMedia(constraints)
  } catch (error) {
    logger.error('getUserMedia error: ', error)
    throw error
  }
}

export const removeUnsupportedConstraints = (
  constraints: MediaTrackConstraints
): void => {
  const supported = WebRTC.getSupportedConstraints()
  Object.keys(constraints).map((key) => {
    if (
      !supported.hasOwnProperty(key) ||
      // @ts-ignore
      constraints[key] === null ||
      // @ts-ignore
      constraints[key] === undefined
    ) {
      // @ts-ignore
      delete constraints[key]
    }
  })
}

export const getMediaConstraints = async (
  options: ConnectionOptions
): Promise<MediaStreamConstraints> => {
  let { audio = true, micId } = options
  const { micLabel = '' } = options
  if (micId) {
    const newMicId = await assureDeviceId(micId, micLabel, 'microphone').catch(
      (_error) => null
    )
    if (newMicId) {
      if (typeof audio === 'boolean') {
        audio = {}
      }
      audio.deviceId = { exact: newMicId }
    }
  }

  let { video = false, camId } = options
  const { camLabel = '' } = options
  if (camId) {
    const newCamId = await assureDeviceId(camId, camLabel, 'camera').catch(
      (_error) => null
    )
    if (newCamId) {
      if (typeof video === 'boolean') {
        video = {}
      }
      video.deviceId = { exact: newCamId }
    }
  }

  return { audio, video }
}

type DestructuredResult = {
  subscribed: string[]
  alreadySubscribed: string[]
  unauthorized: string[]
  unsubscribed: string[]
  notSubscribed: string[]
}

export const destructSubscribeResponse = (
  response: any
): DestructuredResult => {
  const tmp: any = {
    subscribed: [],
    alreadySubscribed: [],
    unauthorized: [],
    unsubscribed: [],
    notSubscribed: [],
  }
  Object.keys(tmp).forEach((k) => {
    tmp[k] = response[`${k}Channels`] || []
  })
  return tmp
}

const _updateMediaStreamTracks = (
  stream: MediaStream,
  kind?: string,
  enabled?: boolean
) => {
  if (!WebRTC.streamIsValid(stream)) {
    return null
  }
  const _updateTrack = (track: MediaStreamTrack) => {
    switch (enabled) {
      case true:
        track.enabled = true
        break
      case false:
        track.enabled = false
        break
      default:
        track.enabled = !track.enabled
        break
    }
  }
  switch (kind) {
    case 'audio':
      return stream.getAudioTracks().forEach(_updateTrack)
    case 'video':
      return stream.getVideoTracks().forEach(_updateTrack)
    default:
      return stream.getTracks().forEach(_updateTrack)
  }
}

export const enableAudioTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'audio', true)
export const disableAudioTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'audio', false)
export const toggleAudioTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'audio')
export const enableVideoTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'video', true)
export const disableVideoTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'video', false)
export const toggleVideoTracks = (stream: MediaStream) =>
  _updateMediaStreamTracks(stream, 'video')
