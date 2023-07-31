import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoRecordingEvent,
  RoomSessionRecording,
  Rooms,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoRecordingWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoRecordingEvent>>
): SagaIterator {
  getLogger().trace('videoRecordingWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for playback')
  }

  let recordingInstance = get<RoomSessionRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = Rooms.createRoomSessionRecordingObject({
      // @ts-expect-error
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRecording>(payload.recording.id, recordingInstance)

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated':
      roomSessionInstance.baseEmitter.emit(type, recordingInstance)
      break
    case 'video.recording.ended':
      roomSessionInstance.baseEmitter.emit(type, recordingInstance)
      remove<RoomSessionRecording>(payload.recording.id)
      break
    default:
      break
  }

  getLogger().trace('videoRecordingWorker ended')
}
