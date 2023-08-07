import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoManagerRoomEvent,
  toExternalJSON,
  VideoManagerRoomEventNames,
  stripNamespacePrefix,
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

  // For now we expose the transformed payload and not a RoomSession
  client.emit(
    stripNamespacePrefix(type) as VideoManagerRoomEventNames,
    toExternalJSON(payload)
  )

  getLogger().trace('videoManagerRoomWorker ended')
}
