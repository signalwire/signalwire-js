import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoLayoutChangedEvent,
  toExternalJSON,
} from '@signalwire/core'
import { RoomSession } from '../RoomSession'
import { VideoCallWorkerParams } from './videoCallingWorker'

export const videoLayoutWorker = function* (
  options: VideoCallWorkerParams<MapToPubSubShape<VideoLayoutChangedEvent>>
): SagaIterator {
  getLogger().trace('videoLayoutWorker started')
  const {
    action: { type, payload },
    instanceMap: { get },
  } = options

  const roomSessionInstance = get<RoomSession>(payload.room_session_id)
  if (!roomSessionInstance) {
    throw new Error('Missing room session instance for playback')
  }

  // TODO: Implement a Layout object when we have a proper payload from the backend
  // Create a layout instance and emit that instance

  switch (type) {
    case 'video.layout.changed':
      // @ts-expect-error
      roomSessionInstance.emit(type, toExternalJSON(payload))
      break
    default:
      break
  }

  getLogger().trace('videoLayoutWorker ended')
}
