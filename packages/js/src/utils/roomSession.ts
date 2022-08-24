import { getLogger } from '@signalwire/core'
import type { VideoAuthorization } from '@signalwire/core'
import type { BaseRoomSessionJoinParams } from './interfaces'

type GetJoinMediaParamsOptions = BaseRoomSessionJoinParams & {
  authState: VideoAuthorization
}

export const getJoinMediaParams = (options: GetJoinMediaParamsOptions) => {
  const {
    authState,
    audio = true,
    video = true,
    sendAudio,
    sendVideo,
    receiveAudio,
    receiveVideo,
  } = options
  const { audio_allowed, video_allowed, join_as } = authState
  const canSend = join_as === 'member'

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
    audio: canSendAudio && reqToSendAudio,
    video: canSendVideo && reqToSendVideo,
    negotiateAudio: canReceiveAudio && reqToReceiveAudio,
    negotiateVideo: canReceiveVideo && reqToReceiveVideo,
  }
}

export const checkMediaParams = (
  options: Record<string, boolean | undefined>
) => {
  // At least one value must be true
  return Object.values(options).some(Boolean)
}
