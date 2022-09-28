import type {
  PubSubContract,
  ConsumerContract,
  UserOptions,
  PubSub as PubSubNamespace,
} from '@signalwire/core'
import { createClient } from '../createClient'

export interface ClientApiEvents extends PubSubNamespace.BasePubSubApiEvents {}

/** @ignore */
export interface ClientFullState extends Client {}
export interface Client
  extends PubSubContract,
    Omit<ConsumerContract<ClientApiEvents, ClientFullState>, 'subscribe'> {}

/** @ignore */
export interface ClientOptions extends UserOptions {}

type ClientMethods = keyof Client
const INTERCEPTED_METHODS: ClientMethods[] = [
  'getAllowedChannels',
  'subscribe',
  'publish',
]

/**
 * You can use the Client object to build a messaging system into the browser.
 *
 * Example usage:
 *
 * ```js
 * import { PubSub } from '@signalwire/js'
 *
 * const pubSubClient = new PubSub.Client({
 *   token: '<your pubSub token>', // get this from the REST APIs
 * })
 *
 * await pubSubClient.subscribe([ 'mychannel1', 'mychannel2' ])
 *
 * pubSubClient.on('message', (message) => {
 *   console.log("Received", message.content,
 *               "on", message.channel,
 *               "at", message.publishedAt)
 * })
 *
 * await pubSubClient.publish({
 *   channel: 'mychannel1',
 *   content: 'hello world'
 * })
 * ```
 *
 * ## Events
 *
 * Please see {@link ClientApiEvents} for the list of events emitted by a pubSub
 * Client object.
 */
export const Client = function (pubSubOptions: ClientOptions) {
  const client = createClient<Client>(pubSubOptions)

  const createInterceptor = <K extends keyof Client>(prop: K) => {
    return async (...params: Parameters<Client[K]>) => {
      await client.connect()

      // @ts-expect-error
      return client.pubSub[prop](...params)
    }
  }

  const interceptors = {
    _session: client,
    disconnect: () => client.disconnect(),
  } as const

  return new Proxy<Client>(client.pubSub, {
    get(target: Client, prop: keyof Client, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      if (INTERCEPTED_METHODS.includes(prop)) {
        return createInterceptor(prop)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (pubSubOptions: ClientOptions): Client }
