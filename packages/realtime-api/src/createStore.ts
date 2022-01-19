import { configureStore, EventEmitter, UserOptions } from '@signalwire/core'
import { Session } from './Session'

export const createStore = (userOptions: {
  project?: string
  token: string
  logLevel?: UserOptions['logLevel']
  emitter: EventEmitter
}) => {
  const store = configureStore({
    userOptions,
    SessionConstructor: Session,
  })

  return store
}
