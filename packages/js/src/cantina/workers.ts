import { getLogger, sagaEffects } from '@signalwire/core'
import type {
  SagaIterator,
  MapToPubSubShape,
  VideoManagerEvent,
  SDKWorker,
  SDKActions,
} from '@signalwire/core'
import type { VideoManager } from './VideoManager'

export const videoManagerWorker: SDKWorker<VideoManager> = function* (
  options
): SagaIterator {
  getLogger().trace('videoManagerWorker started')
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels

  while (true) {
    const action: MapToPubSubShape<VideoManagerEvent> = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return action.type.startsWith('video-manager.')
      }
    )

    yield sagaEffects.put(pubSubChannel, action)
  }
}
