import { getLogger } from '@signalwire/core'
import type { Authorization } from '@signalwire/core'
import type { RoomSessionJoinAudienceParams } from './interfaces'

// `joinAudience` utils
const getJoinAudienceMediaParams = ({
  authState,
  receiveAudio = true,
  receiveVideo = true,
}: RoomSessionJoinAudienceParams & {
  authState: Authorization
}) => {
  const getMediaValue = ({
    remote,
    local,
    kind,
  }: {
    remote?: boolean
    local?: boolean
    kind: 'audio' | 'video'
  }) => {
    if (!remote && local) {
      getLogger().warn(
        `[joinAudience] ${kind} is currently not allowed on this room.`
      )
    }

    return !!(remote && local)
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

const isValidJoinAudienceMediaParams = (
  options: Record<string, boolean | undefined>
) => {
  // At least one value must be true
  return Object.values(options).some(Boolean)
}

export { getJoinAudienceMediaParams, isValidJoinAudienceMediaParams }
