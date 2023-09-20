import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  toExternalJSON,
  VideoRoomAudienceCountEvent,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoRoomAudienceWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoRoomAudienceCountEvent>>
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
      // @ts-expect-error
      roomSessionInstance.emit('room.audienceCount', toExternalJSON(payload))
      break
    default:
      break
  }

  getLogger().trace('videoRoomAudienceWorker ended')
}
