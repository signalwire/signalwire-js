import { Store } from 'redux'
import { AuthError } from './CustomErrors'
import { destroyAction, initAction } from './redux'
import { BaseClientOptions, Emitter } from './utils/interfaces'

export class BaseClient implements Emitter {
  constructor(public options: BaseClientOptions, public store: Store) {}

  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter['on']>) {
    return this.emitter.on(...params)
  }

  off(...params: Parameters<Emitter['off']>) {
    return this.emitter.off(...params)
  }

  once(...params: Parameters<Emitter['once']>) {
    return this.emitter.once(...params)
  }

  emit(...params: Parameters<Emitter['emit']>) {
    return this.emitter.emit(...params)
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    return this.emitter.removeAllListeners(...params)
  }

  /**
   * Connect the underlay WebSocket connection to the SignalWire network.
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
   * @returns void
   */
  disconnect() {
    this.store.dispatch(destroyAction())
  }
}
