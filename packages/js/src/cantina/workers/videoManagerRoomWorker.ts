import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoManagerRoomEvent,
  toExternalJSON,
} from '@signalwire/core'
import { VideoManagerWorkerParams } from './videoManagerWorker'

export const videoManagerRoomWorker = function* (
  options: VideoManagerWorkerParams<MapToPubSubShape<VideoManagerRoomEvent>>
): SagaIterator {
  getLogger().trace('videoManagerRoomWorker started')
  const {
    instance: client,
    action: { type, payload },
  } = options

  const event = type.replace(/^video-manager\./, '')

  // For now we expose the transformed payload and not a RoomSession
  client.baseEmitter.emit(event, toExternalJSON(payload))

  getLogger().trace('videoManagerRoomWorker ended')
}
