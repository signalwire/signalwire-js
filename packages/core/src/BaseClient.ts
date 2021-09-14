import { AuthError } from './CustomErrors'
import { destroyAction, initAction } from './redux'
import { BaseClientOptions } from './utils/interfaces'
import { BaseComponent } from './BaseComponent'
import { EventEmitter } from './utils/EventEmitter'
import { ClientContract } from './types'

export class BaseClient<EventTypes extends EventEmitter.ValidEventTypes>
  extends BaseComponent<EventTypes>
  implements ClientContract<BaseClient<EventTypes>, EventTypes>
{
  constructor(public options: BaseClientOptions<EventTypes>) {
    super(options)
  }

  /**
   * Starts the initialization process as soon as the Client has been
   * registered in the Redux store.
   *
   * @internal
   */
  protected onClientSubscribed() {
    this._attachListeners('')
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
            ? new AuthError(authError.code, authError.error)
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
