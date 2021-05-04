import { Store } from 'redux'
import { initAction, destroyAction } from './redux'
import { Emitter } from './utils/interfaces'
import { AuthError } from './CustomErrors'
import { BaseClientOptions } from './utils/interfaces'

export class SignalWire implements Emitter<SignalWire> {
  constructor(
    public options: BaseClientOptions<SignalWire>,
    public store: Store
  ) {}

  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter['on']>) {
    return this.emitter.on(...params)
  }

  once(...params: Parameters<Emitter['once']>) {
    return this.emitter.once(...params)
  }

  off(...params: Parameters<Emitter['off']>) {
    return this.emitter.off(...params)
  }

  emit(...params: Parameters<Emitter['emit']>) {
    return this.emitter.emit(...params)
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    return this.emitter.removeAllListeners(...params)
  }

  connect() {
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

  disconnect() {
    this.store.dispatch(destroyAction())
  }
}
