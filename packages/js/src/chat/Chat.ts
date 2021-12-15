import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { createClient } from '../createClient'

export interface ChatApiEvents extends ChatNamespace.BaseChatApiEvents {}

export interface ChatFullState extends Chat {}
interface ChatMain
  extends ChatContract,
    Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {}

interface ChatDocs extends ChatMain {}

export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatOptions extends UserOptions {}

export const Chat = function (chatOptions: ChatOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }

  const client = createClient<Chat>(chatOptions)
  const subscribe: Chat['subscribe'] = async (channels) => {
    await client.connect()

    return client.chat.subscribe(channels)
  }
  const publish: Chat['publish'] = async (params) => {
    await client.connect()

    return client.chat.publish(params)
  }

  return new Proxy<Chat>(client.chat, {
    get(target: Chat, prop: keyof Chat, receiver: any) {
      if (prop === 'subscribe') {
        return subscribe
      } else if (prop === 'publish') {
        return publish
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (chatOptions: ChatOptions): Chat }
