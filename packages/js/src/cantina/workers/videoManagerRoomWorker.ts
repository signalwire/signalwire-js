import {
  getLogger,
  SagaIterator,
  MapToPubSubShape,
  VideoManagerRoomEvent,
  toExternalJSON,
} from '@signalwire/core'
import { stripNamespacePrefix } from '../../utils/eventUtils'
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
  client.baseEmitter.emit(stripNamespacePrefix(type), toExternalJSON(payload))

  getLogger().trace('videoManagerRoomWorker ended')
}
