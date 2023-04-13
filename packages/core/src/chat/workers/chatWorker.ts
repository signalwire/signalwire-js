import { SagaIterator } from '@redux-saga/core'
import { BaseChatConsumer } from '../BaseChat'
import {
  sagaEffects,
  SDKWorker,
  getLogger,
  ChatAction,
  toExternalJSON,
  ChatMessage,
  ChatMember,
} from '../../index'

export const chatWorker: SDKWorker<BaseChatConsumer> = function* (
  options
): SagaIterator {
  getLogger().trace('chatWorker started')
  const { instance: client } = options

  function* worker(action: ChatAction) {
    const { type, payload } = action

    switch (type) {
      case 'chat.channel.message': {
        const { channel, message } = payload.params
        const externalJSON = toExternalJSON({
          ...message,
          channel,
        })
        const chatMessage = new ChatMessage(externalJSON)

        // @ts-expect-error
        client.baseEmitter.emit('chat.message', chatMessage)
        break
      }
      case 'chat.member.joined':
      case 'chat.member.updated':
      case 'chat.member.left': {
        const { member } = payload.params
        const externalJSON = toExternalJSON(member)
        const chatMessage = new ChatMember(externalJSON)

        // @ts-expect-error
        client.baseEmitter.emit(type, chatMessage)
        break
      }
      default:
        getLogger().warn(`Unknown chat event: "${type}"`)
        break
    }
  }

  const isChatEvent = (action: any) => action.type.startsWith('chat.')

  while (true) {
    const action: ChatAction = yield sagaEffects.take(isChatEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('chatWorker ended')
}
