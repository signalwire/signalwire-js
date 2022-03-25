import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  getLogger,
  SDKActions,
} from '@signalwire/core'
import type { Messaging } from './Messaging'

export const messagingWorker: SDKWorker<Messaging> = function* (
  options
): SagaIterator {
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels
  while (true) {
    const action: SDKActions = yield sagaEffects.take(
      swEventChannel,
      (action: any) => {
        return action.type.startsWith('messaging.')
      }
    )
    getLogger().debug('messagingWorker:', action)

    switch (action.type) {
      case 'messaging.receive':
      case 'messaging.state': {
        yield sagaEffects.put(pubSubChannel, action)
        break
      }

      default: {
        getLogger().warn('[messagingWorker] Unrecognized Action', action)
        break
      }
    }
  }
}
