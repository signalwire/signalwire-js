import {
  AssertSameType,
  BaseComponentOptions,
  BaseConsumer,
  ChatMethods,
  connect,
  ConsumerContract,
  extendComponent,
  VideoRoomSessionContract,
} from '@signalwire/core'
import { ChatApiEvents } from '../types'

// TODO
type EmitterTransformsEvents = ''

interface ChatMain
  extends VideoRoomSessionContract,
    ConsumerContract<ChatApiEvents, ChatFullState> {}

interface ChatDocs extends ChatMain {}

export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatFullState extends Chat {}

class ChatConsumer extends BaseConsumer<ChatApiEvents> {
  protected _eventsPrefix = 'chat' as const

  subscribe() {
    return new Promise((resolve) => {
      setTimeout(resolve, 500)
    })
  }
}

export const ChatAPI = extendComponent<ChatConsumer, ChatMethods>(
  ChatConsumer,
  {}
)

export const createChatObject = (
  params: BaseComponentOptions<EmitterTransformsEvents>
): Chat => {
  const chat = connect<ChatApiEvents, ChatConsumer, Chat>({
    store: params.store,
    Component: ChatAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return chat
}
