import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  Rooms,
  RoomSessionRTStream,
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

  let streamInstance = get<RoomSessionRTStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = Rooms.createRoomSessionRTStreamObject({
      // @ts-expect-error
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    streamInstance.setPayload(payload)
  }
  set<RoomSessionRTStream>(payload.stream.id, streamInstance)

  switch (type) {
    case 'video.stream.started':
      roomSessionInstance.baseEmitter.emit(type, streamInstance)
      break
    case 'video.stream.ended':
      roomSessionInstance.baseEmitter.emit(type, streamInstance)
      remove<RoomSessionRTStream>(payload.stream.id)
      break
    default:
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
