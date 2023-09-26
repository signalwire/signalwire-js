import {
  getLogger,
  SagaIterator,
  stripNamespacePrefix,
  SDKActions,
  VideoStreamAction,
  SDKWorker,
  sagaEffects,
  VideoStreamEventNames,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RoomSession } from '../RoomSession'
import { RealTimeRoomStreamListeners } from '../../types'
import { RoomSessionStream } from '../RoomSessionStream'

interface VideoStreamWorkerInitialState {
  listeners?: RealTimeRoomStreamListeners
}

export const videoStreamWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoStreamWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { listeners } = initialState as VideoStreamWorkerInitialState

  function* worker(action: VideoStreamAction) {
    const { type, payload } = action

    const roomSessionInstance = get<RoomSession>(payload.room_session_id)
    if (!roomSessionInstance) {
      throw new Error('Missing room session instance for stream')
    }

    let streamInstance = get<RoomSessionStream>(payload.stream.id)
    if (!streamInstance) {
      streamInstance = new RoomSessionStream({
        payload,
        roomSession: roomSessionInstance,
        listeners,
      })
    } else {
      streamInstance.setPayload(payload)
    }
    set<RoomSessionStream>(payload.stream.id, streamInstance)

    const event = stripNamespacePrefix(type) as VideoStreamEventNames

    switch (type) {
      case 'video.stream.started':
        streamInstance.emit(event, streamInstance)
        roomSessionInstance.emit(event, streamInstance)
        break
      case 'video.stream.ended':
        streamInstance.emit(event, streamInstance)
        roomSessionInstance.emit(event, streamInstance)
        remove<RoomSessionStream>(payload.stream.id)
        break
      default:
        break
    }
  }

  const isStreamEvent = (action: SDKActions) =>
    action.type.startsWith('video.stream.')

  while (true) {
    const action: VideoStreamAction = yield sagaEffects.take(
      swEventChannel,
      isStreamEvent
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('videoStreamWorker ended')
}
