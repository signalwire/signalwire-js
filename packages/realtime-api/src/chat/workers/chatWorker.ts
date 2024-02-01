import { SagaIterator } from '@redux-saga/core'
import {
  sagaEffects,
  SDKWorker,
  getLogger,
  ChatAction,
  toExternalJSON,
  ChatMessage,
  ChatMember,
  SDKActions,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'
import type { Client } from '../../client/Client'
import { Chat } from '../Chat'

interface ChatWorkerInitialState {
  chat: Chat
}

export const chatWorker: SDKWorker<Client> = function* (options): SagaIterator {
  getLogger().trace('chatWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { chat } = initialState as ChatWorkerInitialState

  function* worker(action: ChatAction) {
    const { type, payload } = action

    switch (type) {
      case 'chat.channel.message': {
        const { channel, message } = payload
        const externalJSON = toExternalJSON({
          ...message,
          channel,
        })
        const chatMessage = new ChatMessage(externalJSON)

        // @ts-expect-error
        chat.emit(prefixEvent(channel, 'chat.message'), chatMessage)
        break
      }
      case 'chat.member.joined':
      case 'chat.member.updated':
      case 'chat.member.left': {
        const { member, channel } = payload
        const externalJSON = toExternalJSON(member)
        const chatMember = new ChatMember(externalJSON)

        // @ts-expect-error
        chat.emit(prefixEvent(channel, type), chatMember)
        break
      }
      default:
        getLogger().warn(`Unknown chat event: "${type}"`, payload)
        break
    }
  }

  const isChatEvent = (action: SDKActions) => action.type.startsWith('chat.')

  while (true) {
    const action: ChatAction = yield sagaEffects.take(
      swEventChannel,
      isChatEvent
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('chatWorker ended')
}
