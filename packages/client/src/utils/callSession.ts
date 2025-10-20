import { getLogger } from '@signalwire/core'
import type { VideoAuthorization } from '@signalwire/core'
import type { BaseCallSessionDialParams } from './interfaces'

type GetJoinMediaParamsOptions = BaseCallSessionDialParams & {
  authorization: VideoAuthorization
}
/**
 * getJoinMediaParams returns whether the Join method must send/recv
 * audio and video.
 * Based on values on the Auth block (media allowed and join_as type)
 * it matches the user's preferences and return an object that tells
 * if the negotiation has to include sendrecv/sendonly or recvonly
 * for audio and video.
 */
export const getJoinMediaParams = (options: GetJoinMediaParamsOptions) => {
  const {
    authorization,
    audio = true,
    video = true,
    sendAudio,
    sendVideo,
    receiveAudio,
    receiveVideo,
  } = options
  getLogger().debug('getJoinMediaParams options', { ...options })
  const { audio_allowed, video_allowed, join_as } = authorization
  // Fallback to 'member' in case of null/undefined
  const joinAs = join_as ?? 'member'
  const canSend = joinAs === 'member'

  const canSendAudio = canSend && audio_allowed === 'both'
  const canSendVideo = canSend && video_allowed === 'both'
  const canReceiveAudio = audio_allowed !== 'none'
  const canReceiveVideo = video_allowed !== 'none'

  const reqToSendAudio = Boolean(sendAudio ?? audio)
  const reqToSendVideo = Boolean(sendVideo ?? video)
  const reqToReceiveAudio = Boolean(receiveAudio ?? audio)
  const reqToReceiveVideo = Boolean(receiveVideo ?? video)

  if (!canSendAudio && reqToSendAudio) {
    getLogger().info(
      'Not allowed to send audio on this room. Default values will be used.'
    )
  }
  if (!canSendVideo && reqToSendVideo) {
    getLogger().info(
      'Not allowed to send video on this room. Default values will be used.'
    )
  }
  if (!canReceiveAudio && reqToReceiveAudio) {
    getLogger().info(
      'Not allowed to receive video from the room. Default values will be used.'
    )
  }
  if (!canReceiveVideo && reqToReceiveVideo) {
    getLogger().info(
      'Not allowed to receive video from the room. Default values will be used.'
    )
  }
  return {
    mustSendAudio: canSendAudio && reqToSendAudio,
    mustSendVideo: canSendVideo && reqToSendVideo,
    mustRecvAudio: canReceiveAudio && reqToReceiveAudio,
    mustRecvVideo: canReceiveVideo && reqToReceiveVideo,
  }
}

export const checkMediaParams = (
  options: Record<string, boolean | undefined>
) => {
  // At least one value must be true
  return Object.values(options).some(Boolean)
}

export const SDK_PREFIX = 'sw-sdk-'
export const addSDKPrefix = (id: string) => {
  return `${SDK_PREFIX}${id}`
}

export const OVERLAY_PREFIX = 'sw-overlay-'
export const addOverlayPrefix = (id: string) => {
  return `${OVERLAY_PREFIX}${id}`
}
