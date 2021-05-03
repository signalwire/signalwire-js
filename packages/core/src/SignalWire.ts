import { Store } from 'redux'
import { initAction, destroyAction } from './redux'
import { Emitter } from './utils/interfaces'
import { AuthError } from './CustomErrors'

export class SignalWire implements Emitter<SignalWire> {
  constructor(public options: any, public store: Store) {}

  on = this.options.emitter.on
  off = this.options.emitter.off
  once = this.options.emitter.once
  removeAllListeners = this.options.emitter.removeAllListeners
  emit = this.options.emitter.emit

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
