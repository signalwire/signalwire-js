import { getLogger } from '@signalwire/core'
import { getUserMedia as _getUserMedia } from './getUserMedia'
import { assureDeviceId } from './deviceHelpers'
import { ConnectionOptions } from './interfaces'

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
  options: ConnectionOptions
): Promise<MediaStreamConstraints> => {
  const { micLabel = '', micId } = options
  let audio = options.audio ?? true

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

  const { camLabel = '', camId } = options
  let video = options.video ?? true

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

/**
 * Get the priority value for an ICE candidate based on its type.
 * Higher values indicate better network paths.
 * Priority order: relay (4) > srflx (3) > prflx (2) > host (1) > others (0)
 */
export const candidatePriority = (candidate: RTCIceCandidate): number => {
  switch (candidate.type) {
    case 'relay':
      return 4
    case 'srflx':
      return 3
    case 'prflx':
      return 2
    case 'host':
      return 1
    default:
      return 0
  }
}

/**
 * Find the best candidate from an array based on priority.
 * Returns undefined if the array is empty.
 */
export const getBestCandidate = (
  candidates: RTCIceCandidate[]
): RTCIceCandidate | undefined => {
  if (candidates.length === 0) {
    return undefined
  }

  return candidates.reduce((best, current) => {
    return candidatePriority(current) > candidatePriority(best) ? current : best
  }, candidates[0])
}

/**
 * Find candidates from newCandidates that have better priority than the best candidate in currentCandidates.
 * Returns an empty array if no better candidates are found.
 */
export const findBetterCandidates = (
  currentCandidates: RTCIceCandidate[],
  newCandidates: RTCIceCandidate[]
): RTCIceCandidate[] => {
  if (currentCandidates.length === 0 || newCandidates.length === 0) {
    return []
  }

  const bestCurrentCandidate = getBestCandidate(currentCandidates)
  if (!bestCurrentCandidate) {
    return []
  }

  const bestCurrentPriority = candidatePriority(bestCurrentCandidate)
  
  return newCandidates.filter(
    (candidate) => candidatePriority(candidate) > bestCurrentPriority
  )
}

/**
 * Check if the negotiation is single media (audio or video only).
 * This is used to determine if we should handle SDP negotiation differently.
 */
export const isSingleMediaNegotiation = (
  options: ConnectionOptions
): boolean => { 
  const { audio, video, negotiateAudio, negotiateVideo } = options
  const hasAudio = Boolean(audio || negotiateAudio)
  const hasVideo = Boolean(video || negotiateVideo)
  return (hasAudio && !hasVideo) || (!hasAudio && hasVideo)
}