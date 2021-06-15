import {
  BaseClientOptions,
  ClientEvents,
  configureStore,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { JWTSession } from './JWTSession'

/**
 * ## Intro
 * With VideoSDK.createClient you can establish a WebSocket connection
 * with SignalWire and interact with the client.
 *
 * ## Examples
 * Create a client using the JWT
 *
 * @example
 * With autoConnect true the client is ready to be used.
 * ```js
 * try {
 *   const client = await VideoSDK.createClient({
 *     token: '<YourJWT>',
 *   })
 *
 * // Your client is already connected..
 * } catch (error) {
 *   console.error('Auth Error', error)
 * }
 * ```
 *
 * @example
 * With autoConnect false you can attach additional handlers.
 * ```js
 * try {
 *   const client = await VideoSDK.createClient({
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
  const baseUserOptions: BaseClientOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(userOptions),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: JWTSession,
  })
  const client: StrictEventEmitter<Client, ClientEvents> = new Client(
    baseUserOptions,
    store
  )
  if (baseUserOptions.autoConnect) {
    await client.connect()
  }
  return client
}
