import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoRecordingEvent,
  RoomSessionRTRecording,
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

  let recordingInstance = get<RoomSessionRTRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = Rooms.createRoomSessionRTRecordingObject({
      // @ts-expect-error
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRTRecording>(payload.recording.id, recordingInstance)

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated':
      roomSessionInstance.baseEmitter.emit(type, recordingInstance)
      break
    case 'video.recording.ended':
      roomSessionInstance.baseEmitter.emit(type, recordingInstance)
      remove<RoomSessionRTRecording>(payload.recording.id)
      break
    default:
      break
  }

  getLogger().trace('videoRecordingWorker ended')
}
