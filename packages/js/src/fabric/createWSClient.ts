import { ClientEvents, configureStore, getEventEmitter } from '@signalwire/core'
import { SATSession } from './SATSession'
import { WSClientOptions } from './types'

export const createWSClient = (options: WSClientOptions) => {
  const userOptions = {
    ...options,
    // FIXME: This emitter is no longer in used. We should fix TS interface and remove it.
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: userOptions,
    SessionConstructor: SATSession,
  })

  return { ...userOptions, store }
}
