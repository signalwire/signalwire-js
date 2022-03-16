import type { AssertSameType, UserOptions } from '@signalwire/core'
import type { RealTimeCallApiEvents } from '../types'
import { getLogger } from '@signalwire/core'
import { setupClient, clientConnect } from '../client/index'
import { createCallObject, Call } from './Call'
import { VoiceClientDocs } from './VoiceClient.docs'

/**
 * List of events for {@link Voice.Client}.
 */
export interface VoiceClientApiEvents extends RealTimeCallApiEvents {}

/** @ignore */
export interface VoiceApiFullState extends VoiceClient {}
interface VoiceClientMain extends Call {
  new (opts: VoiceClientOptions): this
}

interface VoiceClient
  extends AssertSameType<VoiceClientMain, VoiceClientDocs> {}

/** @ignore */
export interface VoiceClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

/** @ignore */
const VoiceClient = function (options?: VoiceClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const voice = createCallObject({
    store,
    emitter,
  })

  const voiceOn: Call['on'] = (...args) => {
    clientConnect(client)

    return voice.on(...args)
  }
  const voiceOnce: Call['once'] = (...args) => {
    clientConnect(client)

    return voice.once(...args)
  }
  const voiceSubscribe: Call['subscribe'] = async () => {
    await clientConnect(client)

    return voice.subscribe()
  }

  client.on('session.connected', async () => {
    try {
      await voice.subscribe()
    } catch (e) {
      // TODO: In the future we'll provide a
      // `onSubscribedError` (or similar) to allow the user
      // customize this behavior.
      getLogger().error('Client subscription failed.')
      client.disconnect()
    }
  })

  const interceptors = {
    on: voiceOn,
    once: voiceOnce,
    subscribe: voiceSubscribe,
    _session: client,
  } as const

  return new Proxy<Omit<VoiceClient, 'new'>>(voice, {
    get(target: VoiceClient, prop: keyof VoiceClient, receiver: any) {
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
