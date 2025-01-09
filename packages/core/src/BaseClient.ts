import { destroyAction, initAction } from './redux'
import { BaseClientOptions } from './utils/interfaces'
import { BaseComponent } from './BaseComponent'
import { EventEmitter } from './utils/EventEmitter'
import { getAuthStatus } from './redux/features/session/sessionSelectors'

export class BaseClient<
  EventTypes extends EventEmitter.ValidEventTypes
> extends BaseComponent<EventTypes> {
  constructor(public options: BaseClientOptions) {
    super(options)
  }

  /**
   * Connect the underlay WebSocket connection to the SignalWire network.
   *
   * @returns Promise that will resolve with the Client object.
   */
  connect(): Promise<this> {
    const authStatus = getAuthStatus(this.store.getState())

    if (authStatus === 'unknown' || authStatus === 'unauthorized') {
      this.store.dispatch(initAction())
    }

    return this._waitUntilSessionAuthorized()
  }

  /**
   * Disconnect the Client from the SignalWire network.
   */
  disconnect() {
    this.store.dispatch(destroyAction())
  }

  override removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(
    event?: T
  ) {
    this.sessionEventNames().forEach((eventName) => {
      this.sessionEmitter.off(eventName)
    })

    return super.removeAllListeners(event)
  }
}
