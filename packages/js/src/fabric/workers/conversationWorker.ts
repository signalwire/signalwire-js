import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
} from '@signalwire/core'
import { Conversation } from '../Conversation'

export const conversationWorker: SDKWorker<Conversation> = function* (
  options
): SagaIterator {
  getLogger().debug('conversationWorker started')

  const { channels } = options
  const { swEventChannel } = channels

  const isConversationEvent = (action: SDKActions) =>
    action.type.startsWith('conversation.')

  while (true) {
    // @ts-expect-error
    const action: MapToPubSubShape<any> = yield sagaEffects.take(
      swEventChannel,
      isConversationEvent
    )

    // TODO: Invoke event handler
    // instance.handleEvent(action)
  }

  getLogger().trace('conversationWorker ended')
}
