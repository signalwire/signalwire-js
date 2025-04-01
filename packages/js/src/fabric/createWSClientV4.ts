import { configureStore } from '@signalwire/core'
import { SATSessionV4 } from './SATSessionV4'
import { WSClientOptionsV4 } from './interfaces'

export const createWSClientV4 = (options: WSClientOptionsV4) => {
  const store = configureStore({
    userOptions: options,
    SessionConstructor: SATSessionV4,
  })

  return { ...options, store }
}
