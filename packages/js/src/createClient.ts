import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import { ClientAPI, Client } from './Client'
import { JWTSession } from './JWTSession'

/**
 * With Video.createClient() you can establish a WebSocket connection
 * with SignalWire and interact with the client.
 *
 * ## Examples
 * Create a client
 *
 * @example
 * With autoConnect true the client is ready to be used.
 * ```js
 * try {
 *   const client = await Video.createClient({
 *     token: '<YourToken>',
 *   })
 *
 *   // Your client is already connected..
 * } catch (error) {
 *   console.error('Auth Error', error)
 * }
 * ```
 *
 * @example
 * With autoConnect false you can attach additional handlers.
 * ```js
 * try {
 *   const client = await Video.createClient({
 *     token: '<YourJWT>',
 *     autoConnect: false,
 *   })
 *
 *   client.on('socket.closed', () => {
 *     // The WebSocket connection is closed
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
    SessionConstructor: JWTSession,
  })
  const client = connect<
    ClientEvents,
    ClientAPI<RoomSessionType>,
    Client<RoomSessionType>
  >({
    store,
    Component: ClientAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(baseUserOptions)

  return client
}
