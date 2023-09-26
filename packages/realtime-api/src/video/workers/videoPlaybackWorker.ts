import {
  getLogger,
  SagaIterator,
  stripNamespacePrefix,
  VideoPlaybackEventNames,
  SDKActions,
  VideoPlaybackAction,
  SDKWorker,
  sagaEffects,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RoomSession } from '../RoomSession'
import { RealTimeRoomPlaybackListeners } from '../../types'
import { RoomSessionPlayback } from '../RoomSessionPlayback'

interface VideoPlayWorkerInitialState {
  listeners?: RealTimeRoomPlaybackListeners
}

export const videoPlaybackWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoPlaybackWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { listeners } = initialState as VideoPlayWorkerInitialState

  function* worker(action: VideoPlaybackAction) {
    const { type, payload } = action

    const roomSessionInstance = get<RoomSession>(payload.room_session_id)
    if (!roomSessionInstance) {
      throw new Error('Missing room session instance for playback')
    }

    let playbackInstance = get<RoomSessionPlayback>(payload.playback.id)
    if (!playbackInstance) {
      playbackInstance = new RoomSessionPlayback({
        payload,
        roomSession: roomSessionInstance,
        listeners,
      })
    } else {
      playbackInstance.setPayload(payload)
    }
    set<RoomSessionPlayback>(payload.playback.id, playbackInstance)

    const event = stripNamespacePrefix(type) as VideoPlaybackEventNames
    switch (type) {
      case 'video.playback.started':
      case 'video.playback.updated':
        playbackInstance.emit(event, playbackInstance)
        roomSessionInstance.emit(event, playbackInstance)
        return false
      case 'video.playback.ended':
        playbackInstance.emit(event, playbackInstance)
        roomSessionInstance.emit(event, playbackInstance)
        remove<RoomSessionPlayback>(payload.playback.id)
        return true
      default:
        return false
    }
  }

  const isPlaybackEvent = (action: SDKActions) =>
    action.type.startsWith('video.playback.')

  while (true) {
    const action: VideoPlaybackAction = yield sagaEffects.take(
      swEventChannel,
      isPlaybackEvent
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('videoPlaybackWorker ended')
}
