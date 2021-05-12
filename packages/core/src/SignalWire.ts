import { Store } from 'redux'
import { initAction, destroyAction } from './redux'
import { Emitter } from './utils/interfaces'
import { AuthError } from './CustomErrors'
import { BaseClientOptions } from './utils/interfaces'

export class SignalWire<T extends string> implements Emitter<T, SignalWire<T>> {
  constructor(
    public options: BaseClientOptions<SignalWire<T>, T>,
    public store: Store
  ) {}

  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter<T>['on']>) {
    return this.emitter.on(...params)
  }

  once(...params: Parameters<Emitter<T>['once']>) {
    return this.emitter.once(...params)
  }

  off(...params: Parameters<Emitter<T>['off']>) {
    return this.emitter.off(...params)
  }

  emit(...params: Parameters<Emitter<T>['emit']>) {
    return this.emitter.emit(...params)
  }

  removeAllListeners(...params: Parameters<Emitter<T>['removeAllListeners']>) {
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
