import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionRecording,
  Rooms,
  VideoRecordingEvent,
  VideoRecordingEventNames,
  stripNamespacePrefix,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoRecordWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoRecordingEvent>>
): SagaIterator {
  getLogger().trace('videoRecordWorker started')
  const {
    instance: roomSession,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let recordingInstance = get<RoomSessionRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = Rooms.createRoomSessionRecordingObject({
      store: roomSession.store,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRecording>(payload.recording.id, recordingInstance)

  const event = stripNamespacePrefix(type) as VideoRecordingEventNames

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated': {
      roomSession.emit(event, recordingInstance)
      break
    }
    case 'video.recording.ended':
      roomSession.emit(event, recordingInstance)
      remove<RoomSessionRecording>(payload.recording.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoRecordWorker ended')
}
