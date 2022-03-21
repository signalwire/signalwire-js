import {
  AssertSameType,
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { getLogger } from '@signalwire/core'
import { clientConnect, setupClient, RealtimeClient } from '../client/index'
import { ChatClientApiEventsDocs, ClientDocs } from './ChatClient.docs'

export interface ChatClientApiEventsMain extends ChatNamespace.BaseChatApiEvents {}
export interface ChatClientApiEvents extends AssertSameType<ChatClientApiEventsMain, ChatClientApiEventsDocs> {}

export interface ClientFullState extends ChatClient {}
interface ClientMain
  extends ChatContract,
    Omit<ConsumerContract<ChatClientApiEvents, ClientFullState>, 'subscribe'> {

  new (opts: ChatClientOptions): this

  /** @internal */
  _session: RealtimeClient
}

/**
 * You can use instances of this class to control the chat and subscribe to its
 * events. Please see {@link ChatClientApiEvents} for the full list of events
 * you can subscribe to.
 *
 * @example
 *
 * ```javascript
 * const chatClient = new Chat.Client({
 *   project: '<project-id>',
 *   token: '<api-token>'
 * })
 * 
 * await chatClient.subscribe([ 'mychannel1', 'mychannel2' ])
 *
 * chatClient.on('message', (message) => {
 *   console.log("Received", message.content,
 *               "on", message.channel,
 *               "at", message.publishedAt)
 * })
 *
 * await chatClient.publish({
 *   channel: 'mychannel1',
 *   content: 'hello world'
 * })
 * ```
 */
interface ChatClient extends AssertSameType<ClientMain, ClientDocs> {}

interface ChatClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

const ChatClient = function (options?: ChatClientOptions) {
  if ('production' === process.env.NODE_ENV) {
    getLogger().warn(
      '`Chat` is still under development and may change in the future without prior notice.'
    )
  }
  const { client, store, emitter } = setupClient(options)
  const chat = ChatNamespace.createBaseChatObject<ChatClient>({
    store,
    emitter,
  })
  const chatOn: ChatClient['on'] = (...args) => {
    clientConnect(client)

    return chat.on(...args)
  }
  const chatOnce: ChatClient['once'] = (...args) => {
    clientConnect(client)

    return chat.once(...args)
  }
  const subscribe: ChatClient['subscribe'] = async (channels) => {
    await clientConnect(client)

    return chat.subscribe(channels)
  }
  const publish: ChatClient['publish'] = async (params) => {
    await clientConnect(client)

    return chat.publish(params)
  }

  const interceptors = {
    on: chatOn,
    once: chatOnce,
    subscribe,
    publish,
    _session: client,
  } as const

  return new Proxy<ChatClient>(chat, {
    get(target: ChatClient, prop: keyof ChatClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: ChatClientOptions): ChatClient }

export { ChatClient as Client }
