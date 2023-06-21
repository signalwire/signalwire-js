import { SagaIterator } from '@redux-saga/core'
import { Chat } from '../Chat'
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

export const chatWorker: SDKWorker<Chat> = function* (options): SagaIterator {
  getLogger().trace('chatWorker started')
  const {
    channels: { swEventChannel },
    initialState: { chatEmitter },
  } = options

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

        chatEmitter.emit(prefixEvent(channel, 'chat.message'), chatMessage)
        break
      }
      case 'chat.member.joined':
      case 'chat.member.updated':
      case 'chat.member.left': {
        const { member, channel } = payload
        const externalJSON = toExternalJSON(member)
        const chatMessage = new ChatMember(externalJSON)

        chatEmitter.emit(prefixEvent(channel, type), chatMessage)
        break
      }
      default:
        getLogger().warn(`Unknown chat event: "${type}"`)
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
