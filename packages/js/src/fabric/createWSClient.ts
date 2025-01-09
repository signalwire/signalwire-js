import { configureStore } from '@signalwire/core'
import { SATSession } from './SATSession'
import { WSClientOptions } from './types'

export const createWSClient = (options: WSClientOptions) => {
  const store = configureStore({
    userOptions: options,
    SessionConstructor: SATSession,
  })

  return { ...options, store }
}
