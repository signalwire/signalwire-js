import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  Rooms,
  RoomSessionStream,
  VideoStreamEvent,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoStreamWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoStreamEvent>>
): SagaIterator {
  getLogger().trace('videoStreamWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for stream')
  }

  let streamInstance = get<RoomSessionStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = Rooms.createRoomSessionStreamObject({
      // @ts-expect-error
      store: client.store,
      payload,
    })
  } else {
    streamInstance.setPayload(payload)
  }
  set<RoomSessionStream>(payload.stream.id, streamInstance)

  switch (type) {
    case 'video.stream.started':
      // @ts-expect-error
      roomSessionInstance.emit(type, streamInstance)
      break
    case 'video.stream.ended':
      // @ts-expect-error
      roomSessionInstance.emit(type, streamInstance)
      remove<RoomSessionStream>(payload.stream.id)
      break
    default:
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
