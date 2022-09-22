import {
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { clientConnect, setupClient, RealtimeClient } from '../client/index'
import type { RealTimeChatApiEventsHandlerMapping } from '../types/chat'

export interface ChatClientApiEvents
  extends ChatNamespace.BaseChatApiEvents<RealTimeChatApiEventsHandlerMapping> {}

export interface ClientFullState extends ChatClient {}
interface ChatClient
  extends Omit<ChatContract, 'getAllowedChannels' | 'updateToken'>,
    Omit<ConsumerContract<ChatClientApiEvents, ClientFullState>, 'subscribe'> {
  new (opts: ChatClientOptions): this

  /** @internal */
  _session: RealtimeClient
}
export interface ChatClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

type ClientMethods = Exclude<keyof ChatClient, '_session'>
const INTERCEPTED_METHODS: ClientMethods[] = [
  'subscribe',
  'publish',
  'getMessages',
  'getMembers',
  'getMemberState',
  'setMemberState',
]
const UNSUPPORTED_METHODS = ['getAllowedChannels', 'updateToken']

/**
 * You can use instances of this class to control the chat and subscribe to its
 * events. Please see {@link ChatClientApiEvents} for the full list of events
 * you can subscribe to.
 *
 * @param options - {@link ChatClientOptions}
 *
 * @returns - {@link ChatClient}
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
const ChatClient = function (options?: ChatClientOptions) {
  const { client, store, emitter } = setupClient(options)
  const chat = ChatNamespace.createBaseChatObject<ChatClient>({
    store,
    emitter,
  })

  const createInterceptor = <K extends ClientMethods>(prop: K) => {
    return async (...params: Parameters<ChatClient[K]>) => {
      await clientConnect(client)

      // @ts-expect-error
      return chat[prop](...params)
    }
  }

  const interceptors = {
    _session: client,
    disconnect: () => client.disconnect(),
  } as const

  return new Proxy<ChatClient>(chat, {
    get(target: ChatClient, prop: keyof ChatClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      // FIXME: types and _session check
      if (prop !== '_session' && INTERCEPTED_METHODS.includes(prop)) {
        return createInterceptor(prop)
      } else if (UNSUPPORTED_METHODS.includes(prop)) {
        return undefined
      }

      // Always connect the underlying client if the user call a function on the Proxy
      if (typeof target[prop] === 'function') {
        clientConnect(client)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: ChatClientOptions): ChatClient }

export { ChatClient as Client }
