import { SagaIterator } from '@redux-saga/core'
import { BasePubSubConsumer } from '../BasePubSub'
import { PRODUCT_PREFIX_PUBSUB } from '../../utils/constants'
import {
  sagaEffects,
  PubSubEventAction,
  SDKWorker,
  getLogger,
  PubSubMessage,
  toExternalJSON,
} from '../../index'

export const pubSubWorker: SDKWorker<BasePubSubConsumer> = function* (
  options
): SagaIterator {
  getLogger().trace('pubSubWorker started')
  const {
    instance: client,
    channels: { swEventChannel },
  } = options

  function* worker(action: PubSubEventAction) {
    const { type, payload } = action

    switch (type) {
      case `${PRODUCT_PREFIX_PUBSUB}.channel.message`: {
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

        client.emit('message', pubSubMessage)
        break
      }
      default:
        getLogger().warn(`Unknown pubsub event: "${type}"`)
        break
    }
  }

  const isPubSubEvent = (action: any) =>
    action.type.startsWith(`${PRODUCT_PREFIX_PUBSUB}.`)

  while (true) {
    const action: PubSubEventAction = yield sagaEffects.take(
      swEventChannel,
      isPubSubEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('pubSubWorker ended')
}
