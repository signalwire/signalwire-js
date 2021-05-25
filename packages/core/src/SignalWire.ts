import { Store } from 'redux'
import { initAction, destroyAction } from './redux'
import { Emitter } from './utils/interfaces'
import { AuthError } from './CustomErrors'
import { BaseClientOptions } from './utils/interfaces'

export class SignalWire<EventType extends string>
  implements Emitter<EventType, SignalWire<EventType>> {
  constructor(
    public options: BaseClientOptions<SignalWire<EventType>, EventType>,
    public store: Store
  ) {}

  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter<EventType, this>['on']>) {
    return this.emitter.on(...params)
  }

  once(...params: Parameters<Emitter<EventType, this>['once']>) {
    return this.emitter.once(...params)
  }

  off(...params: Parameters<Emitter<EventType, this>['off']>) {
    return this.emitter.off(...params)
  }

  emit(...params: Parameters<Emitter<EventType, this>['emit']>) {
    return this.emitter.emit(...params)
  }

  removeAllListeners(
    ...params: Parameters<Emitter<EventType, this>['removeAllListeners']>
  ) {
    return this.emitter.removeAllListeners(...params)
  }

  /**
   * Connect the underlay WebSocket connection to the SignalWire network.
   *
   * @example
   * ```js
   * const client = await Video.createClient({
   *   token: '<YourJWT>',
   *   autoConnect: false,
   * })
   *
   * client.on('socket.closed', () => {
   *   // The WebSocket connection is closed
   * })
   *
   * await client.connect()
   * ```
   *
   * @returns Promise that will resolve with the Client object.
   */
  connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.store.subscribe(() => {
        const state = this.store.getState()
        const { authStatus, authError } = state.session
        if (authStatus === 'authorized') {
          resolve(this)
          unsubscribe()
        } else if (authStatus === 'unauthorized') {
          const error = authError
            ? new AuthError(authError.code, authError.message)
            : new Error('Unauthorized')
          reject(error)
          unsubscribe()
        }
      })

      this.store.dispatch(initAction())
    })
  }

  /**
   * Disconnect the Client from the SignalWire network.
   *
   * @example
   * ```js
   * const client = await Video.createClient({
   *   token: '<YourJWT>',
   * })
   *
   * // .. use your client...
   *
   * client.disconnect()
   * ```
   */
  disconnect() {
    this.store.dispatch(destroyAction())
  }
}
