import {
  getLogger,
  SagaIterator,
  SDKWorkerParams,
  MapToPubSubShape,
  toExternalJSON,
  VideoRoomAudienceCountEvent,
} from '@signalwire/core'
import type { Client } from '../VideoClient'
import { RoomSession } from '../RoomSession'

type VideoLayoutEvents = MapToPubSubShape<VideoRoomAudienceCountEvent>

export const videoRoomAudienceWorker = function* (
  options: SDKWorkerParams<Client> & {
    action: VideoLayoutEvents
  }
): SagaIterator {
  getLogger().trace('videoRoomAudienceWorker started')
  const {
    action: { type, payload },
    instanceMap: { get },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for playback')
  }

  switch (type) {
    case 'video.room.audience_count':
      roomSessionInstance.baseEmitter.emit(
        `video.room.audienceCount`,
        toExternalJSON(payload)
      )
      break
    default:
      break
  }

  getLogger().trace('videoRoomAudienceWorker ended')
}
