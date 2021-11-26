import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  ChatApiEvents,
} from '@signalwire/core'
import { createClient } from '../createClient'

export interface ChatFullState extends Chat {}
interface ChatMain
  extends ChatContract,
    Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {}

interface ChatDocs extends Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {
  /** Publish docs */
  publish(params: {
    message: any
    channel: string
    meta?: any
  }): any

  /** Subscribe docs */
  subscribe(channels: string[]): any
}

/**
 * You can use the Chat object to ...
 * 
 * ```js
 * let example = 'example'
 * ```
 * 
 * ## Events
 *
 * Please see {@link ChatEvents} for the list of events emitted by a
 * Chat object.
 */
export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatOptions extends UserOptions {}

export const Chat = function (chatOptions: ChatOptions) {
  const client = createClient<Chat>(chatOptions)
  const subscribe: Chat['subscribe'] = async (channels) => {
    await client.connect()

    return await client.chat.subscribe(channels)
  }
  const publish: Chat['publish'] = async (params) => {
    await client.connect()

    return await client.chat.publish(params)
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
