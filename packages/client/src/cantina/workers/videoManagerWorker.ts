import { getLogger, sagaEffects } from '@signalwire/core'
import type {
  SagaIterator,
  MapToPubSubShape,
  VideoManagerEvent,
  SDKWorker,
  SDKActions,
  SDKWorkerParams,
} from '@signalwire/core'
import type { VideoManager } from '../VideoManager'
import { videoManagerRoomsWorker } from './videoManagerRoomsWorker'
import { videoManagerRoomWorker } from './videoManagerRoomWorker'

export type VideoManagerWorkerParams<T> = SDKWorkerParams<VideoManager> & {
  action: T
}

export const videoManagerWorker: SDKWorker<VideoManager> = function* (
  options
): SagaIterator {
  getLogger().trace('videoManagerWorker started')
  const {
    channels: { swEventChannel },
  } = options

  function* worker(action: MapToPubSubShape<VideoManagerEvent>) {
    const { type } = action

    switch (type) {
      case 'video-manager.rooms.subscribed':
        yield sagaEffects.fork(videoManagerRoomsWorker, {
          action,
          ...options,
        })
        break
      case 'video-manager.room.added':
      case 'video-manager.room.deleted':
      case 'video-manager.room.ended':
      case 'video-manager.room.started':
      case 'video-manager.room.updated':
        yield sagaEffects.fork(videoManagerRoomWorker, {
          action,
          ...options,
        })
        break
      default:
        getLogger().warn(`Unknown video-manager event: "${type}"`)
        break
    }
  }

  while (true) {
    const action: MapToPubSubShape<VideoManagerEvent> = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return action.type.startsWith('video-manager.')
      }
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('videoManagerWorker ended')
}
