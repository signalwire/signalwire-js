import {
  ConsumerContract,
  UserOptions,
  PubSub as PubSubNamespace,
  PubSubContract,
} from '@signalwire/core'
import { clientConnect, setupClient, RealtimeClient } from '../client/index'
import type { RealTimePubSubApiEventsHandlerMapping } from '../types/pubSub'

export interface PubSubClientApiEvents
  extends PubSubNamespace.BasePubSubApiEvents<RealTimePubSubApiEventsHandlerMapping> {}

export interface ClientFullState extends PubSubClient {}
interface PubSubClient
  extends Omit<PubSubContract, 'getAllowedChannels' | 'updateToken'>,
    Omit<
      ConsumerContract<PubSubClientApiEvents, ClientFullState>,
      'subscribe'
    > {
  new (opts: PubSubClientOptions): this

  /** @internal */
  _session: RealtimeClient
}

interface PubSubClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

type ClientMethods = Exclude<keyof PubSubClient, '_session'>
const INTERCEPTED_METHODS: ClientMethods[] = ['subscribe', 'publish']
const UNSUPPORTED_METHODS = ['getAllowedChannels', 'updateToken']

/**
 * Creates a new PubSub client.
 *
 * @param options - {@link PubSubClientOptions}
 *
 * @example
 *
 * ```js
 * import { PubSub } from '@signalwire/realtime-api'
 *
 * const pubSubClient = new PubSub.Client({
 *   project: '<project-id>',
 *   token: '<api-token>'
 * })
 * ```
 */
const PubSubClient = function (options?: PubSubClientOptions) {
  const { client, store, emitter } = setupClient(options)
  const pubSub = PubSubNamespace.createBasePubSubObject<PubSubClient>({
    store,
    emitter,
  })

  const createInterceptor = <K extends ClientMethods>(prop: K) => {
    return async (...params: Parameters<PubSubClient[K]>) => {
      await clientConnect(client)

      // @ts-expect-error
      return pubSub[prop](...params)
    }
  }

  const interceptors = {
    _session: client,
    disconnect: () => client.disconnect(),
  } as const

  return new Proxy<PubSubClient>(pubSub, {
    get(target: PubSubClient, prop: keyof PubSubClient, receiver: any) {
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
} as unknown as { new (options?: PubSubClientOptions): PubSubClient }

export { PubSubClient as Client }
