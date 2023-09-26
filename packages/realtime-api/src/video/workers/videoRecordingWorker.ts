import {
  getLogger,
  SagaIterator,
  stripNamespacePrefix,
  SDKActions,
  VideoRecordingAction,
  SDKWorker,
  sagaEffects,
  VideoRecordingEventNames,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { RoomSession } from '../RoomSession'
import { RealTimeRoomRecordingListeners } from '../../types'
import { RoomSessionRecording } from '../RoomSessionRecording'

interface VideoRecordingWorkerInitialState {
  listeners?: RealTimeRoomRecordingListeners
}

export const videoRecordingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('videoRecordingWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { listeners } = initialState as VideoRecordingWorkerInitialState

  function* worker(action: VideoRecordingAction) {
    const { type, payload } = action

    const roomSessionInstance = get<RoomSession>(payload.room_session_id)
    if (!roomSessionInstance) {
      throw new Error('Missing room session instance for recording')
    }

    let recordingInstance = get<RoomSessionRecording>(payload.recording.id)
    if (!recordingInstance) {
      recordingInstance = new RoomSessionRecording({
        payload,
        roomSession: roomSessionInstance,
        listeners,
      })
    } else {
      recordingInstance.setPayload(payload)
    }
    set<RoomSessionRecording>(payload.recording.id, recordingInstance)

    const event = stripNamespacePrefix(type) as VideoRecordingEventNames

    switch (type) {
      case 'video.recording.started':
      case 'video.recording.updated':
        recordingInstance.emit(event, recordingInstance)
        roomSessionInstance.emit(event, recordingInstance)
        return false
      case 'video.recording.ended':
        recordingInstance.emit(event, recordingInstance)
        roomSessionInstance.emit(event, recordingInstance)
        remove<RoomSessionRecording>(payload.recording.id)
        return true
      default:
        return false
    }
  }

  const isRecordingEvent = (action: SDKActions) =>
    action.type.startsWith('video.recording.')

  while (true) {
    const action: VideoRecordingAction = yield sagaEffects.take(
      swEventChannel,
      isRecordingEvent
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('videoRecordingWorker ended')
}
