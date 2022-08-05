import type {
  ChatContract,
  ConsumerContract,
  UserOptions,
  Chat as ChatNamespace,
} from '@signalwire/core'
import { createClient } from '../createClient'

export interface ClientApiEvents extends ChatNamespace.BaseChatApiEvents {}

/** @ignore */
export interface ClientFullState extends Client {}
export interface Client
  extends ChatContract,
    Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {}


/** @ignore */
export interface ClientOptions extends UserOptions {}

type ClientMethods = keyof Client
const INTERCEPTED_METHODS: ClientMethods[] = [
  'subscribe',
  'publish',
  'updateToken',
  'getMessages',
  'getMembers',
  'getMemberState',
  'getAllowedChannels',
  'setMemberState',
]

/**
 * You can use the Client object to build a messaging system into the browser.
 *
 * Example usage:
 *
 * ```js
 * import { Chat } from '@signalwire/js'
 *
 * const chatClient = new Chat.Client({
 *   token: '<your_chat_token>',  // get this from the REST APIs
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
 *
 * ## Events
 *
 * Please see {@link ClientApiEvents} for the list of events emitted by a chat
 * Client object.
 */
export const Client = function (chatOptions: ClientOptions) {
  const client = createClient<Client>(chatOptions)

  const createInterceptor = <K extends keyof Client>(prop: K) => {
    return async (...params: Parameters<Client[K]>) => {
      await client.connect()

      // @ts-expect-error
      return client.chat[prop](...params)
    }
  }

  return new Proxy<Client>(client.chat, {
    get(target: Client, prop: keyof Client, receiver: any) {
      if (INTERCEPTED_METHODS.includes(prop)) {
        return createInterceptor(prop)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (chatOptions: ClientOptions): Client }
