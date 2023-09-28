import {
  getLogger,
  SagaIterator,
  VideoRecordingEventNames,
  stripNamespacePrefix,
  VideoRecordingAction,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'
import { RoomSessionRecording } from '../RoomSessionRecording'

export const videoRecordingWorker = function* (
  options: VideoCallWorkerParams<VideoRecordingAction>
): SagaIterator {
  getLogger().trace('videoRecordingWorker started')
  const {
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for playback')
  }

  let recordingInstance = get<RoomSessionRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = new RoomSessionRecording({
      roomSession: roomSessionInstance,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRecording>(payload.recording.id, recordingInstance)

  const event = stripNamespacePrefix(type) as VideoRecordingEventNames

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated':
      roomSessionInstance.emit(event, recordingInstance)
      recordingInstance.emit(event, recordingInstance)
      break
    case 'video.recording.ended':
      roomSessionInstance.emit(event, recordingInstance)
      recordingInstance.emit(event, recordingInstance)
      remove<RoomSessionRecording>(payload.recording.id)
      break
    default:
      break
  }

  getLogger().trace('videoRecordingWorker ended')
}
