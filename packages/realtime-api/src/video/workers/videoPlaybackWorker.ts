import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoPlaybackEvent,
  RoomSessionPlayback,
  Rooms,
  stripNamespacePrefix,
  VideoPlaybackEventNames,
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

  let playbackInstance = get<RoomSessionPlayback>(payload.playback.id)
  if (!playbackInstance) {
    playbackInstance = Rooms.createRoomSessionPlaybackObject({
      // @ts-expect-error
      store: client.store,
      payload,
    })
  } else {
    playbackInstance.setPayload(payload)
  }
  set<RoomSessionPlayback>(payload.playback.id, playbackInstance)

  const event = stripNamespacePrefix(type) as VideoPlaybackEventNames

  switch (type) {
    case 'video.playback.started':
    case 'video.playback.updated':
      roomSessionInstance.emit(event, playbackInstance)
      break
    case 'video.playback.ended':
      roomSessionInstance.emit(event, playbackInstance)
      remove<RoomSessionPlayback>(payload.playback.id)
      break
    default:
      break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
