import { SagaIterator } from '@redux-saga/core'
import { PubSub } from '../PubSub'
import {
  sagaEffects,
  PubSubEventAction,
  SDKWorker,
  getLogger,
  PubSubMessage,
  toExternalJSON,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'

export const pubSubWorker: SDKWorker<PubSub> = function* (
  options
): SagaIterator {
  getLogger().trace('pubSubWorker started')
  const {
    channels: { swEventChannel },
    initialState: { pubSubEmitter },
  } = options

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

        pubSubEmitter.emit(prefixEvent(channel, 'chat.message'), pubSubMessage)
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
