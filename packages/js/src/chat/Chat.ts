import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { createClient } from '../createClient'

export interface ChatClientApiEvents extends ChatNamespace.BaseChatApiEvents {}

export interface ChatClientFullState extends ChatClient {}
interface ChatClientMain
  extends ChatContract,
    Omit<
      ConsumerContract<ChatClientApiEvents, ChatClientFullState>,
      'subscribe'
    > {}

interface ChatClientDocs extends ChatClientMain {}

export interface ChatClient
  extends AssertSameType<ChatClientMain, ChatClientDocs> {}

export interface ChatClientOptions extends UserOptions {}

export const Client = function (chatOptions: ChatClientOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }

  const client = createClient<ChatClient>(chatOptions)
  const subscribe: ChatClient['subscribe'] = async (channels) => {
    await client.connect()

    return client.chat.subscribe(channels)
  }
  const publish: ChatClient['publish'] = async (params) => {
    await client.connect()

    return client.chat.publish(params)
  }

  return new Proxy<ChatClient>(client.chat, {
    get(target: ChatClient, prop: keyof ChatClient, receiver: any) {
      if (prop === 'subscribe') {
        return subscribe
      } else if (prop === 'publish') {
        return publish
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (chatOptions: ChatClientOptions): ChatClient }
