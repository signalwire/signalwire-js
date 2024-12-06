import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoStreamEvent,
  RoomSessionStream,
  Rooms,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoStreamWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoStreamEvent>>
): SagaIterator {
  getLogger().trace('videoStreamWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let streamInstance = get<RoomSessionStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = Rooms.createRoomSessionStreamObject({
      store: roomSession.store,
      payload,
    })
  } else {
    streamInstance.setPayload(payload)
  }
  set<RoomSessionStream>(payload.stream.id, streamInstance)

  switch (type) {
    case 'video.stream.started':
      roomSession.emit('stream.started', streamInstance)
      break
    case 'video.stream.ended':
      roomSession.emit('stream.ended', streamInstance)
      remove<RoomSessionStream>(payload.stream.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
