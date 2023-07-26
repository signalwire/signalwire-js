import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionRTRecording,
  Rooms,
  VideoRecordingEvent,
  VideoRecordingEventNames,
} from '@signalwire/core'
import { stripNamespacePrefix } from '../utils/eventUtils'
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

  let recordingInstance = get<RoomSessionRTRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = Rooms.createRoomSessionRTRecordingObject({
      store: roomSession.store,
      // @ts-expect-error
      emitter: roomSession.emitter,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRTRecording>(payload.recording.id, recordingInstance)

  const event = stripNamespacePrefix(type) as VideoRecordingEventNames

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated': {
      roomSession.baseEmitter.emit(event, recordingInstance)
      break
    }
    case 'video.recording.ended':
      roomSession.baseEmitter.emit(event, recordingInstance)
      remove<RoomSessionRTRecording>(payload.recording.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoRecordWorker ended')
}
