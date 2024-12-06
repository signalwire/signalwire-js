import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionPlayback,
  Rooms,
  VideoPlaybackEvent,
  VideoPlaybackEventNames,
  stripNamespacePrefix,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoPlaybackWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoPlaybackEvent>>
): SagaIterator {
  getLogger().trace('videoPlaybackWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let playbackInstance = get<RoomSessionPlayback>(payload.playback.id)
  if (!playbackInstance) {
    playbackInstance = Rooms.createRoomSessionPlaybackObject({
      store: roomSession.store,
      payload,
    })
  } else {
    playbackInstance.setPayload(payload)
  }
  set<RoomSessionPlayback>(payload.playback.id, playbackInstance)

  const event = stripNamespacePrefix(type) as VideoPlaybackEventNames

  switch (type) {
    case 'video.playback.started':
    case 'video.playback.updated': {
      roomSession.emit(event, playbackInstance)
      break
    }
    case 'video.playback.ended':
      roomSession.emit(event, playbackInstance)
      remove<RoomSessionPlayback>(payload.playback.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
