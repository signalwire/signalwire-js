import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoStreamEvent,
  RoomSessionRTStream,
  Rooms,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoStreamWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoStreamEvent>>
): SagaIterator {
  getLogger().trace('videoStreamWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let streamInstance = get<RoomSessionRTStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = Rooms.createRoomSessionRTStreamObject({
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
      client.baseEmitter.emit('stream.started', streamInstance)
      break
    case 'video.stream.ended':
      client.baseEmitter.emit('stream.ended', streamInstance)
      remove<RoomSessionRTStream>(payload.stream.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
