import { getLogger } from '@signalwire/core'
import { getUserMedia as _getUserMedia } from './getUserMedia'
import { assureDeviceId } from './deviceHelpers'
import { ConnectionOptions } from './interfaces'
import { sdpHasAudio, sdpHasVideo } from './sdpHelpers'

// FIXME: Remove and use getUserMedia directly
export const getUserMedia = (constraints: MediaStreamConstraints) => {
  getLogger().info('RTCService.getUserMedia', constraints)
  const { audio, video } = constraints
  if (!audio && !video) {
    return
  }

  return _getUserMedia(constraints)
}

const _shouldNegotiateVideo = (options: ConnectionOptions) => {
  return (
    (options.negotiateVideo ?? true) &&
    (!options.remoteSdp || sdpHasVideo(options.remoteSdp))
  )
}

const _shouldNegotiateAudio = (options: ConnectionOptions) => {
  return (
    (options.negotiateAudio ?? true) &&
    (!options.remoteSdp || sdpHasAudio(options.remoteSdp))
  )
}

const _getVideoConstraints = (options: ConnectionOptions) => {
  return _shouldNegotiateVideo(options)
    ? options.video ?? !!options.camId
    : false
}

const _getAudioConstraints = (options: ConnectionOptions) => {
  return _shouldNegotiateAudio(options) ? options.audio ?? true : false
}

export const getMediaConstraints = async (
  options: ConnectionOptions
): Promise<MediaStreamConstraints> => {
  let audio = _getAudioConstraints(options)
  let video = _getVideoConstraints(options)

  const {
    micLabel = '',
    micId,
    camLabel = '',
    camId,
    useStereo,
  } = options

  const channelCount = useStereo ? 2 : 1
  if (typeof audio === 'boolean' && audio) {
    audio = { channelCount }
  } else if (typeof audio === 'object') {
    audio.channelCount = channelCount
  }

  if (typeof video === 'boolean' && video) {
    video = {}
  }

  if (micId && audio) {
    const newMicId = await assureDeviceId(micId, micLabel, 'microphone').catch(
      (_error) => null
    )
    if (newMicId) {
      audio.deviceId = { exact: newMicId }
    }
  }

  if (camId && video) {
    const newCamId = await assureDeviceId(camId, camLabel, 'camera').catch(
      (_error) => null
    )
    if (newCamId) {
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
