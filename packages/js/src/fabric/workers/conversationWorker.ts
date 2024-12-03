import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  ConversationEvent,
} from '@signalwire/core'
import { Conversation } from '../Conversation'
import { WSClient } from '../WSClient'

interface ConversationWorkerInitialState {
  conversation: Conversation
}

export const conversationWorker: SDKWorker<WSClient> = function* (
  options
): SagaIterator {
  getLogger().debug('conversationWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { conversation } = initialState as ConversationWorkerInitialState

  const isConversationEvent = (action: SDKActions) => {
    return action.type.startsWith('conversation.')
  }

  while (true) {
    const action: MapToPubSubShape<ConversationEvent> = yield sagaEffects.take(
      swEventChannel,
      isConversationEvent
    )
    conversation.handleEvent(action.payload)
  }

  getLogger().trace('conversationWorker ended')
}
