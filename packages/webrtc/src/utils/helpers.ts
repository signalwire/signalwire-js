import { getLogger } from '@signalwire/core'
import { getUserMedia as _getUserMedia } from './getUserMedia'
import { assureDeviceId } from './deviceHelpers'
import { ConnectionOptions } from './interfaces'
import { hasMediaSection } from './sdpHelpers'

// FIXME: Remove and use getUserMedia directly
export const getUserMedia = (constraints: MediaStreamConstraints) => {
  getLogger().info('RTCService.getUserMedia', constraints)
  const { audio, video } = constraints
  if (!audio && !video) {
    return
  }

  return _getUserMedia(constraints)
}

export const getMediaConstraints = async (
  options: ConnectionOptions,
  remoteSDP?: string
): Promise<MediaStreamConstraints> => {
  const { audio: optionsAudio, micId } = options
  const { micLabel = '' } = options
  let audio: boolean | MediaTrackConstraints =
    remoteSDP && hasMediaSection(remoteSDP, 'audio')
      ? optionsAudio || true
      : false //should not request audio when the remote SDP don't accept audio

  if (micId && audio) {
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

  let { video: optionsVideo, camId } = options
  const { camLabel = '' } = options
  let video: boolean | MediaTrackConstraints =
    remoteSDP && hasMediaSection(remoteSDP, 'video')
      ? optionsVideo || !!camId
      : false //should not request video when the remote SDP don't accept video

  if (camId && video) {
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

interface FilterIceServersOptions {
  disableUdpIceServers?: boolean
}

export const filterIceServers = (
  servers: RTCIceServer[],
  options: FilterIceServersOptions
) => {
  const { disableUdpIceServers = false } = options

  const filterOutUdpUrls = (urls: string | string[]) => {
    const transportParam = 'transport=udp'

    if (Array.isArray(urls)) {
      return urls.filter((url) => !url.includes(transportParam))
    }

    return urls.includes(transportParam) ? '' : urls
  }

  return servers.map((server) => ({
    ...server,
    urls: disableUdpIceServers ? filterOutUdpUrls(server.urls) : server.urls,
  }))
}
