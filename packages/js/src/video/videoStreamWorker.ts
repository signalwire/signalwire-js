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
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  let streamInstance = get<RoomSessionRTStream>(payload.stream.id)
  if (!streamInstance) {
    streamInstance = Rooms.createRoomSessionRTStreamObject({
      store: roomSession.store,
      // @ts-expect-error
      emitter: roomSession.emitter,
      payload,
    })
  } else {
    streamInstance.setPayload(payload)
  }
  set<RoomSessionRTStream>(payload.stream.id, streamInstance)

  switch (type) {
    case 'video.stream.started':
      roomSession.baseEmitter.emit('stream.started', streamInstance)
      break
    case 'video.stream.ended':
      roomSession.baseEmitter.emit('stream.ended', streamInstance)
      remove<RoomSessionRTStream>(payload.stream.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoStreamWorker ended')
}
