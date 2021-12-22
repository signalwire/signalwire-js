import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  getLogger,
} from '@signalwire/core'

export const messagingWorker: SDKWorker = function* ({
  channels: { pubSubChannel },
}): SagaIterator {
  while (true) {
    const action: any = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('messaging.')
    })
    getLogger().debug('messagingWorker:', action)

    switch (action.type) {
      case 'messaging.state': {
        yield sagaEffects.put(pubSubChannel, action)
        break
      }
      case 'messaging.receive': {
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
