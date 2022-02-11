import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  getLogger,
} from '@signalwire/core'
import type { RelayClient } from './RelayClient'

export const relayWorker: SDKWorker<RelayClient> = function* ({
  instance,
  channels: { pubSubChannel: _pubSubChannel },
}): SagaIterator {
  while (true) {
    const action: any = yield sagaEffects.take((action: any) => {
      return action.type.startsWith('calling.')
    })
    getLogger().debug('relayWorker:', action)

    switch (action.type) {
      case 'calling.call.receive': {
        instance.calling._onReceive(action.payload.params)
        break
      }

      default: {
        getLogger().warn('[relayWorker] Unrecognized Action', action)
        break
      }
    }
  }
}
