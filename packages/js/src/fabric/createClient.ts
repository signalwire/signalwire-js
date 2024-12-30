import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import { SATSession } from './SATSession'
import { Client, ClientAPI } from './Client'

/**
 * With `await SignalWire()` you can establish a WebSocket connection
 * with SignalWire and interact with the client.
 *
 * ## Examples
 * Create a client
 *
 * @example
 * ```js
 * try {
 *   const client = new SignalWire({
 *     token: '<YourJWT>',
 *   })
 *
 *   await client.connect()
 *   // Your client is ready now..
 * } catch (error) {
 *   console.error('Error', error)
 * }
 * ```
 * @internal
 */
export const createClient = (userOptions: UserOptions) => {
  const baseUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: SATSession,
  })
  const client = connect<ClientEvents, ClientAPI, Client>({
    store,
    Component: ClientAPI,
  })(baseUserOptions)

  return client
}
