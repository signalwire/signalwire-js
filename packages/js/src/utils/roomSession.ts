import { getLogger } from '@signalwire/core'
import type {
  VideoAuthorization,
  MediaDirectionAllowed,
} from '@signalwire/core'
import type {
  RoomSessionJoinAudienceParams,
  BaseRoomSessionJoinParams,
} from './interfaces'

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

  const canSendAudio = audio_allowed === 'both'
  const canSendVideo = video_allowed === 'both'
  const canReceiveAudio = audio_allowed !== 'none'
  const canReceiveVideo = video_allowed !== 'none'

  const reqToSendAudio = Boolean(sendAudio ?? audio)
  const reqToSendVideo = Boolean(sendVideo ?? video)
  const reqToReceiveAudio = Boolean(receiveAudio ?? audio)
  const reqToReceiveVideo = Boolean(receiveVideo ?? video)

  return {
    audio: canSend && canSendAudio && reqToSendAudio,
    video: canSend && canSendVideo && reqToSendVideo,
    negotiateAudio: canReceiveAudio && reqToReceiveAudio,
    negotiateVideo: canReceiveVideo && reqToReceiveVideo,
  }
}

// `joinAudience` utils
export const getJoinAudienceMediaParams = ({
  authState,
  receiveAudio = true,
  receiveVideo = true,
}: RoomSessionJoinAudienceParams & {
  authState: VideoAuthorization
}) => {
  const getMediaValue = ({
    remote,
    local,
    kind,
  }: {
    remote: MediaDirectionAllowed
    local: boolean
    kind: 'audio' | 'video'
  }) => {
    const remoteAllowed = remote !== 'none'
    if (!remoteAllowed && local) {
      getLogger().warn(
        `[joinAudience] ${kind} is currently not allowed on this room.`
      )
    }

    return !!(remoteAllowed && local)
  }

  return {
    audio: false,
    video: false,
    negotiateAudio: getMediaValue({
      remote: authState.audio_allowed,
      local: receiveAudio,
      kind: 'audio',
    }),
    negotiateVideo: getMediaValue({
      remote: authState.video_allowed,
      local: receiveVideo,
      kind: 'video',
    }),
  }
}

export const isValidJoinAudienceMediaParams = (
  options: Record<string, boolean | undefined>
) => {
  // At least one value must be true
  return Object.values(options).some(Boolean)
}
