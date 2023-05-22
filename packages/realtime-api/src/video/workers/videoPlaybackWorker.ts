import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoPlaybackEvent,
  RoomSessionRTPlayback,
  Rooms,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoPlaybackWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoPlaybackEvent>>
): SagaIterator {
  getLogger().trace('videoPlaybackWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for playback')
  }

  let playbackInstance = get<RoomSessionRTPlayback>(payload.playback.id)
  if (!playbackInstance) {
    playbackInstance = Rooms.createRoomSessionRTPlaybackObject({
      // @ts-expect-error
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    playbackInstance.setPayload(payload)
  }
  set<RoomSessionRTPlayback>(payload.playback.id, playbackInstance)

  switch (type) {
    case 'video.playback.started':
    case 'video.playback.updated':
      roomSessionInstance.baseEmitter.emit(type, playbackInstance)
      break
    case 'video.playback.ended':
      roomSessionInstance.baseEmitter.emit(type, playbackInstance)
      remove<RoomSessionRTPlayback>(payload.playback.id)
      break
    default:
      break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
