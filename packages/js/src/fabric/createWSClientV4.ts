import { configureStore } from '@signalwire/core'
import { SATSessionV4 } from './SATSessionV4'
import { WSClientOptions } from './interfaces'

export const createWSClientV4 = (options: WSClientOptions) => {
  const store = configureStore({
    userOptions: options,
    SessionConstructor: SATSessionV4,
  })

  return { ...options, store }
}
