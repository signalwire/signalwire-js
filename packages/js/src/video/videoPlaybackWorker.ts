import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionRTPlayback,
  Rooms,
  VideoPlaybackEvent,
  VideoPlaybackEventNames,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoPlaybackWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoPlaybackEvent>>
): SagaIterator {
  getLogger().trace('videoPlaybackWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let playbackInstance = get<RoomSessionRTPlayback>(payload.playback.id)
  if (!playbackInstance) {
    playbackInstance = Rooms.createRoomSessionRTPlaybackObject({
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    playbackInstance.setPayload(payload)
  }
  set<RoomSessionRTPlayback>(payload.playback.id, playbackInstance)

  const event = type.replace(/^video\./, '') as VideoPlaybackEventNames

  switch (type) {
    case 'video.playback.started':
    case 'video.playback.updated': {
      client.baseEmitter.emit(event, playbackInstance)
      break
    }
    case 'video.playback.ended':
      client.baseEmitter.emit(event, playbackInstance)
      remove<RoomSessionRTPlayback>(payload.playback.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
