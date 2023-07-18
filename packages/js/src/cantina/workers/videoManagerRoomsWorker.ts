import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoManagerRoomsSubscribedEvent,
  toExternalJSON,
} from '@signalwire/core'
import { VideoManagerWorkerParams } from './videoManagerWorker'

export const videoManagerRoomsWorker = function* (
  options: VideoManagerWorkerParams<
    MapToPubSubShape<VideoManagerRoomsSubscribedEvent>
  >
): SagaIterator {
  getLogger().trace('videoManagerRoomsWorker started')
  const {
    instance: client,
    action: { type, payload },
  } = options

  const event = type.replace(/^video-manager\./, '')

  // For now we expose the transformed payload and not a RoomSession
  const modPayload = {
    rooms: payload.rooms.map((row) => toExternalJSON(row)),
  }
  client.baseEmitter.emit(event, modPayload)

  getLogger().trace('videoManagerRoomsWorker ended')
}
