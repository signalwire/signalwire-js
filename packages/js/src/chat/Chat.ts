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
    ConsumerContract<ChatApiEvents, ChatFullState> {}

interface ChatDocs extends ChatMain {}

export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatOptions extends UserOptions {}

export const Chat = function (chatOptions: ChatOptions) {
  const client = createClient<Chat>(chatOptions)

  return new Proxy<Omit<Chat, 'new'>>(client.chat, {
    get(target: Chat, prop: any, receiver: any) {
      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (chatOptions: ChatOptions): Chat }
