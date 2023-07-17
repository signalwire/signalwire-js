import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  RoomSessionRTRecording,
  Rooms,
  VideoRecordingEvent,
  VideoRecordingEventNames,
} from '@signalwire/core'
import { VideoWorkerParams } from './videoWorker'

export const videoRecordWorker = function* (
  options: VideoWorkerParams<MapToPubSubShape<VideoRecordingEvent>>
): SagaIterator {
  getLogger().trace('videoRecordWorker started')
  const {
    instance: client,
    action: { type, payload },
    instanceMap: { get, set, remove },
  } = options

  // For now, we are not storing the RoomSession object in the instance map

  let recordingInstance = get<RoomSessionRTRecording>(payload.recording.id)
  if (!recordingInstance) {
    recordingInstance = Rooms.createRoomSessionRTRecordingObject({
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    recordingInstance.setPayload(payload)
  }
  set<RoomSessionRTRecording>(payload.recording.id, recordingInstance)

  const event = type.replace(/^video\./, '') as VideoRecordingEventNames

  switch (type) {
    case 'video.recording.started':
    case 'video.recording.updated': {
      client.baseEmitter.emit(event, recordingInstance)
      break
    }
    case 'video.recording.ended':
      client.baseEmitter.emit(event, recordingInstance)
      remove<RoomSessionRTRecording>(payload.recording.id)
      break
    default:
      getLogger().warn(`Unknown video.stream event: "${type}"`)
      break
  }

  getLogger().trace('videoRecordWorker ended')
}
