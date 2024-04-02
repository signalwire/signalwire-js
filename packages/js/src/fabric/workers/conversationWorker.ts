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
import { Client } from '../Client'

interface ConversationWorkerInitialState {
  conversation: Conversation
}

export const conversationWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().debug('conversationWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { conversation } = initialState as ConversationWorkerInitialState

  const isConversationEvent = (action: SDKActions) => {
    return action.type === 'conversation.message'
  }

  while (true) {
    const action: MapToPubSubShape<ConversationEvent> = yield sagaEffects.take(
      swEventChannel,
      isConversationEvent
    )
    console.log('In worker', action)
    conversation.handleEvent(action.payload)
  }

  getLogger().trace('conversationWorker ended')
}
