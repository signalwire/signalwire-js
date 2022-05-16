import type { AssertSameType, UserOptions } from '@signalwire/core'
import { setupClient, clientConnect } from '../client/index'
import { createCallObject, Call } from './Call'
import { VoiceClientDocs } from './VoiceClient.docs'
import { createVoiceObject, Voice } from './Voice'

interface VoiceClientMain extends Voice {
  new (opts: VoiceClientOptions): this
}

/**
 * You can use instances of this class to initiate or receive calls. Please see
 * {@link VoiceClientApiEvents} for the full list of events you can subscribe to.
 * 
 * @example
 *
 * The following example answers any call in the "office" context.
 *
 * ```javascript
 * const client = new Voice.Client({
 *   project: "<project-id>",
 *   token: "<api-token>",
 *   contexts: ['office']
 * })
 *
 * client.on('call.received', async (call) => {
 *   console.log('Got call', call.from, call.to)
 *
 *   try {
 *     await call.answer()
 *     console.log('Inbound call answered')
 *   } catch (error) {
 *     console.error('Error answering inbound call', error)
 *   }
 * })
 * ```
 * 
 * @example
 *
 * The following example initiates a new call.
 *
 * ```javascript
 * const client = new Voice.Client({
 *   project: "<project-id>",
 *   token: "<api-token>",
 *   contexts: ['office']
 * })
 *
 * try {
 *   const call = await client.dialPhone({
 *     from: '+YYYYYYYYYY',
 *     to: '+XXXXXXXXXX',
 *     timeout: 30,
 *   })
 * } catch (e) {
 *   console.log("Call not answered.")
 * }
 * ```
 */
interface VoiceClient
  extends AssertSameType<VoiceClientMain, VoiceClientDocs> {}

/** @ignore */
export interface VoiceClientOptions
  extends Omit<UserOptions, '_onRefreshToken'> {
  contexts: string[]
}

/** @ignore */
const VoiceClient = function (options?: VoiceClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const voice = createVoiceObject({
    store,
    emitter,
    ...options,
  })

  const clientOn: Voice['on'] = (...args) => {
    clientConnect(client)

    return voice.on(...args)
  }
  const clientOnce: Voice['once'] = (...args) => {
    clientConnect(client)

    return voice.once(...args)
  }

  const callDial: Call['dial'] = async (dialer) => {
    await clientConnect(client)

    const call = createCallObject({
      store,
      emitter,
    })

    await call.dial(dialer)

    return call
  }

  const interceptors = {
    on: clientOn,
    once: clientOnce,
    dial: callDial,
    _session: client,
  } as const

  return new Proxy<Omit<Voice, 'new'>>(voice, {
    get(target, prop, receiver) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: VoiceClientOptions): VoiceClient }

export { VoiceClient as Client }
