import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
} from '@signalwire/core'
import { createClient } from '../createClient'
import { ChatApiEvents } from '../types'

export interface ChatFullState extends Chat {}
interface ChatMain
  extends ChatContract,
    Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {}

interface ChatDocs extends ChatMain {}

export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatOptions extends UserOptions {}

export const Chat = function (chatOptions: ChatOptions) {
  const client = createClient<Chat>(chatOptions)
  const subscribe: Chat['subscribe'] = async (channels) => {
    await client.connect()

    await client.chat.subscribe(channels)
  }
  const publish: Chat['publish'] = async () => {}

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
