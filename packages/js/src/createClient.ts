import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import { ClientAPI, Client } from './Client'
import { JWTSession } from './JWTSession'
import { UnifiedJWTSession } from './UnifiedJWTSession'

/**
 * With Video.createClient() you can establish a WebSocket connection
 * with SignalWire and interact with the client.
 *
 * ## Examples
 * Create a client
 *
 * @example
 * ```js
 * try {
 *   const client = Video.createClient({
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
export const createClient = <RoomSessionType>(userOptions: UserOptions) => {
  const baseUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: userOptions.unifiedEventing
      ? UnifiedJWTSession
      : JWTSession,
  })
  const client = connect<
    ClientEvents,
    ClientAPI<RoomSessionType>,
    Client<RoomSessionType>
  >({
    store,
    Component: ClientAPI,
  })(baseUserOptions)

  return client
}
