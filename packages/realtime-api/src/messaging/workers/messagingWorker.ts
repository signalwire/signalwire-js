import {
  MessagingAction,
  SDKActions,
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { Message } from '../Messaging'

export const messagingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('messagingWorker started')
  const {
    instance: client,
    channels: { swEventChannel },
  } = options

  function* worker(action: MessagingAction) {
    const { payload, type } = action

    // @ts-expect-error
    const message = new Message(payload)

    switch (type) {
      case 'messaging.receive':
        // @ts-expect-error
        client.baseEmitter.emit('message.received', message)
        break
      case 'messaging.state':
        // @ts-expect-error
        client.baseEmitter.emit('message.updated', message)
        break
      default:
        getLogger().warn(`Unknown message event: "${action.type}"`)
        break
    }
  }

  const isMessagingEvent = (action: SDKActions) =>
    action.type.startsWith('messaging.')

  while (true) {
    const action: MessagingAction = yield sagaEffects.take(
      swEventChannel,
      isMessagingEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('messagingWorker ended')
}
