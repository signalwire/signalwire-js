import { configureStore, getEventEmitter, UserOptions } from '@signalwire/core'
import { Session } from '../Session'

export const setupInternals = (userOptions: {
  project?: string
  token: string
  logLevel?: UserOptions['logLevel']
}) => {
  /**
   * The emitter will be used across the entire stack so no
   * need to type it here. Typings will be provided by each
   * constructor.
   */
  const emitter = getEventEmitter<any>()

  const baseOptions = {
    ...userOptions,
    emitter,
  }

  const store = configureStore({
    userOptions: baseOptions,
    SessionConstructor: Session,
  })

  return { store, emitter }
}
