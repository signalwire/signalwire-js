import type {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  ChatApiEvents,
} from '@signalwire/core'
import { createClient } from '../createClient'

export interface ChatFullState extends Chat { }
interface ChatMain
  extends ChatContract,
  Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {
  new(chatOptions: ChatOptions): this
}

interface ChatDocs extends Omit<ConsumerContract<ChatApiEvents, ChatFullState>, 'subscribe'> {
  /**
   * Creates a new Chat client.
   * 
   * @example
   * 
   * ```js
   * import { Chat } from '@signalwire/js'
   * 
   * const chat = new Chat({
   *   token: '<your_chat_token>',
   * })
   * ```
   */
  new(chatOptions: {
    /** SignalWire Chat token (you can get one with the REST APIs) */
    token: string
    /** logging level */
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  }): this

  /**
   * Publishes a message in the specified channel.
   * 
   * @returns a promise that is resolved when the subscription has been
   * completed.
   */
  publish(params: {
    /** The message to be published */
    message: any
    /** Name of the channel on which to publish the message */
    channel: string
    /** Additional metadata */
    meta?: any
  }): any

  /**
   * Subscribes to the specified channels. After subscribing, the client will
   * start receiving the messages that are published on the specified channels.
   *
   * @param channels list of channel names to subscribe to
   *
   * @returns a promise that is resolved when the subscription has been
   * completed.
   */
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
