import {
  ExecuteParams,
  EventEmitter,
  JSONRPCSubscribeMethod,
  validateEventsToSubscribe,
  uuid,
} from '@signalwire/core'
import { ListenSubscriber } from '../ListenSubscriber'
import { SWClient } from '../SWClient'

export class BaseVideo<
  T extends {},
  EventTypes extends EventEmitter.ValidEventTypes
> extends ListenSubscriber<T, EventTypes> {
  protected subscribeMethod: JSONRPCSubscribeMethod = 'signalwire.subscribe'
  protected subscribeParams?: Record<string, any> = {}
  protected eventChannel?: string = ''

  constructor(options: SWClient) {
    super({ swClient: options })
  }

  protected getSubscriptions() {
    return validateEventsToSubscribe(this.eventNames())
  }

  protected async subscribe(listeners: T) {
    const _uuid = uuid()

    // Attach listeners
    this._attachListeners(listeners)

    // Subscribe to video events
    await this.subscribeEvents()

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Detach listeners
          this._detachListeners(listeners)

          // Remove listeners from the listener map
          this.removeFromListenerMap(_uuid)

          // Unsubscribe from video events
          await this.unsubscribeEvents()

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    // Add listeners to the listener map
    this.addToListenerMap(_uuid, {
      listeners,
      unsub,
    })

    return unsub
  }

  protected async subscribeEvents() {
    const subscriptions = this.getSubscriptions()

    const executeParams: ExecuteParams = {
      method: this.subscribeMethod,
      params: {
        ...this.subscribeParams,
        event_channel: this.eventChannel,
        events: subscriptions,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  protected async unsubscribeEvents() {
    const executeParams: ExecuteParams = {
      method: 'signalwire.unsubscribe',
      params: {
        event_channel: this.eventChannel,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }
}
