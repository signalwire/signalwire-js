import type { AssertSameType, UserOptions } from '@signalwire/core'
import type { RealTimeCallApiEvents } from '../types'
import { getLogger } from '@signalwire/core'
import { setupClient, clientConnect, RealtimeClient } from '../client/index'
import { createCallObject, Call } from './Call'
import { CallClientDocs } from './CallClient.docs'

/**
 * List of events for {@link Voice.Call}.
 */
export interface CallClientApiEvents extends RealTimeCallApiEvents {}

interface CallClientMain extends Call {
  new (opts: CallClientOptions): this
}

interface CallClient extends AssertSameType<CallClientMain, CallClientDocs> {}

/** @ignore */
export interface CallClientOptions
  extends Omit<UserOptions, 'host' | '_onRefreshToken' | 'token'> {
  token?: string
}

/** @ignore */
const CallClient = function (options?: CallClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const clientOn: RealtimeClient['on'] = (...args) => {
    clientConnect(client)

    return client.on(...args)
  }
  const clientOnce: RealtimeClient['once'] = (...args) => {
    clientConnect(client)

    return client.once(...args)
  }

  const callDial: Call['dial'] = async (...args) => {
    await clientConnect(client)

    const call = createCallObject({
      store,
      emitter,
    })

    client.once('session.connected', async () => {
      try {
        await call.subscribe()
      } catch (e) {
        // TODO: In the future we'll provide a
        // `onSubscribedError` (or similar) to allow the user
        // customize this behavior.
        getLogger().error('Client subscription failed.')
        client.disconnect()
      }
    })

    await call.dial(...args)

    return call
  }

  const interceptors = {
    on: clientOn,
    once: clientOnce,
    dial: callDial,
    _session: client,
  } as const

  return new Proxy<Omit<RealtimeClient, 'new'>>(client, {
    get(target, prop, receiver) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: CallClientOptions): CallClient }

export { CallClient }
