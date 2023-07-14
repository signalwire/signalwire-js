import {
  MapToPubSubShape,
  SDKActions,
  SDKWorker,
  SagaIterator,
  VideoAPIEventParams,
  getLogger,
  sagaEffects,
  SDKWorkerParams,
} from '@signalwire/core'
import { RoomSessionConnection } from '../BaseRoomSession'
import { videoStreamWorker } from './videoStreamWorker'

export type VideoWorkerParams<T> = SDKWorkerParams<RoomSessionConnection> & {
  action: T
}

export const videoWorker: SDKWorker<RoomSessionConnection> = function* (
  options
): SagaIterator {
  const { channels } = options
  const { swEventChannel } = channels

  function* worker(action: MapToPubSubShape<VideoAPIEventParams>) {
    const { type } = action

    switch (type) {
      case 'video.stream.ended':
      case 'video.stream.started':
        yield sagaEffects.fork(videoStreamWorker, {
          action,
          ...options,
        })
        break
      default:
        getLogger().warn(`Unknown video event: "${type}"`)
        break
    }
  }

  const isVideoEvent = (action: SDKActions) => action.type.startsWith('video.')

  while (true) {
    const action: MapToPubSubShape<VideoAPIEventParams> =
      yield sagaEffects.take(swEventChannel, isVideoEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('videoWorker ended')
}
