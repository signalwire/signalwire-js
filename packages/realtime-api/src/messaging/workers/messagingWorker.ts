import {
  MessagingAction,
  SDKActions,
  SDKWorker,
  SagaIterator,
  getLogger,
  sagaEffects,
} from '@signalwire/core'
import type { Client } from '../../client/Client'
import { prefixEvent } from '../../utils/internals'
import { Message } from '../Messaging'
import { Messaging } from '../Messaging'

interface MessagingWorkerInitialState {
  messaging: Messaging
}

export const messagingWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('messagingWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { messaging } = initialState as MessagingWorkerInitialState

  function* worker(action: MessagingAction) {
    const { payload, type } = action

    // @ts-expect-error
    const message = new Message(payload)

    switch (type) {
      case 'messaging.receive':
        messaging.emit(
          // @ts-expect-error
          prefixEvent(payload.context, 'message.received'),
          message
        )
        break
      case 'messaging.state':
        // @ts-expect-error
        messaging.emit(prefixEvent(payload.context, 'message.updated'), message)
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
