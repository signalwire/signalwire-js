import { SagaIterator } from '@redux-saga/core'
import {
  sagaEffects,
  PubSubEventAction,
  SDKWorker,
  getLogger,
  PubSubMessage,
  toExternalJSON,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'
import type { Client } from '../../client/Client'
import { PubSub } from '../PubSub'

interface PubSubWorkerInitialState {
  pubSub: PubSub
}

export const pubSubWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('pubSubWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { pubSub } = initialState as PubSubWorkerInitialState

  function* worker(action: PubSubEventAction) {
    const { type, payload } = action

    switch (type) {
      case 'chat.channel.message': {
        const {
          channel,
          /**
           * Since we're using the same event as `Chat`
           * the payload comes with a `member` prop. To
           * avoid confusion (since `PubSub` doesn't
           * have members) we'll remove it from the
           * payload sent to the end user.
           */
          // @ts-expect-error
          message: { member, ...restMessage },
        } = payload
        const externalJSON = toExternalJSON({
          ...restMessage,
          channel,
        })
        const pubSubMessage = new PubSubMessage(externalJSON)

        // @ts-expect-error
        pubSub.emit(prefixEvent(channel, 'chat.message'), pubSubMessage)
        break
      }
      default:
        getLogger().warn(`Unknown pubsub event: "${type}"`, payload)
        break
    }
  }

  const isPubSubEvent = (action: any) => action.type.startsWith('chat.')

  while (true) {
    const action: PubSubEventAction = yield sagaEffects.take(
      swEventChannel,
      isPubSubEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('pubSubWorker ended')
}
