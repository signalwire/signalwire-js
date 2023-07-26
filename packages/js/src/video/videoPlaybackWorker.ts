import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionRTPlayback,
  Rooms,
  VideoPlaybackEvent,
  VideoPlaybackEventNames,
} from '@signalwire/core'
import { stripNamespacePrefix } from '../utils/eventUtils'
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

  let playbackInstance = get<RoomSessionRTPlayback>(payload.playback.id)
  if (!playbackInstance) {
    playbackInstance = Rooms.createRoomSessionRTPlaybackObject({
      store: roomSession.store,
      // @ts-expect-error
      emitter: roomSession.emitter,
      payload,
    })
  } else {
    playbackInstance.setPayload(payload)
  }
  set<RoomSessionRTPlayback>(payload.playback.id, playbackInstance)

  const event = stripNamespacePrefix(type) as VideoPlaybackEventNames

  switch (type) {
    case 'video.playback.started':
    case 'video.playback.updated': {
      roomSession.baseEmitter.emit(event, playbackInstance)
      break
    }
    case 'video.playback.ended':
      roomSession.baseEmitter.emit(event, playbackInstance)
      remove<RoomSessionRTPlayback>(payload.playback.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
