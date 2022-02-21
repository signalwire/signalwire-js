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
      return (
        action.type.startsWith('calling.') ||
        action.type.startsWith('messaging.') ||
        action.type === 'queuing.relay.tasks'
      )
    })

    switch (action.type) {
      case 'calling.call.receive': {
        instance.calling._onReceive(action.payload.params)
        break
      }
      case 'calling.call.dial': {
        // @ts-expect-error
        instance.calling._onDial(action.payload.params)
        break
      }
      case 'calling.call.state': {
        // @ts-expect-error
        instance.calling._onState(action.payload.params)
        break
      }
      case 'calling.call.connect': {
        // @ts-expect-error
        instance.calling._onConnect(action.payload.params)
        break
      }
      case 'calling.call.record': {
        // @ts-expect-error
        instance.calling._onRecord(action.payload.params)
        break
      }
      case 'calling.call.play': {
        // @ts-expect-error
        instance.calling._onPlay(action.payload.params)
        break
      }
      case 'calling.call.collect': {
        // @ts-expect-error
        instance.calling._onCollect(action.payload.params)
        break
      }
      case 'calling.call.fax': {
        // @ts-expect-error
        instance.calling._onFax(action.payload.params)
        break
      }
      case 'calling.call.detect': {
        // @ts-expect-error
        instance.calling._onDetect(action.payload.params)
        break
      }
      case 'calling.call.tap': {
        // @ts-expect-error
        instance.calling._onTap(action.payload.params)
        break
      }
      case 'calling.call.send_digits': {
        // @ts-expect-error
        instance.calling._onSendDigits(action.payload.params)
        break
      }

      /**
       * TASK EVENTS
       */
      case 'queuing.relay.tasks': {
        instance.tasking.onTaskingReceive(action.payload)
        break
      }

      /**
       * MESSAGING EVENTS
       */
      case 'messaging.receive': {
        instance.messaging.onMessagingReceive(action.payload.params)
        break
      }
      case 'messaging.state': {
        instance.messaging.onMessagingState(action.payload.params)
        break
      }

      default: {
        getLogger().warn('[relayWorker] Unrecognized Action', action)
        break
      }
    }
  }
}
