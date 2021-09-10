import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { JWTSession } from './JWTSession'

/**
 * ## Intro
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
 */
export const createClient = async (userOptions: UserOptions) => {
  const baseUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: JWTSession,
  })
  const client = connect<ClientEvents, Client>({
    store,
    Component: Client,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
      id: 'onClientSubscribed',
    },
  })(baseUserOptions)
  if (baseUserOptions.autoConnect) {
    await client.connect()
  }
  return client
}
