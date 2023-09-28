import {
  ExecuteParams,
  EventEmitter,
  JSONRPCSubscribeMethod,
  validateEventsToSubscribe,
  uuid,
  JSONRPCUnSubscribeMethod,
} from '@signalwire/core'
import { ListenSubscriber } from '../ListenSubscriber'
import { SWClient } from '../SWClient'

export class BaseVideo<
  T extends {},
  EventTypes extends EventEmitter.ValidEventTypes
> extends ListenSubscriber<T, EventTypes> {
  protected subscribeMethod: JSONRPCSubscribeMethod = 'signalwire.subscribe'
  protected unsubscribeMethod: JSONRPCUnSubscribeMethod =
    'signalwire.unsubscribe'
  protected _subscribeParams?: Record<string, any> = {}
  protected _eventChannel?: string = ''

  constructor(options: SWClient) {
    super({ swClient: options })
  }

  protected get eventChannel() {
    return this._eventChannel
  }

  protected getSubscriptions() {
    return validateEventsToSubscribe(this.eventNames())
  }

  protected async subscribe(listeners: T) {
    const _uuid = uuid()

    // Attach listeners
    this._attachListeners(listeners)

    // Subscribe to video events
    await this.addEvents()

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Detach listeners
          this._detachListeners(listeners)

          // Remove listeners from the listener map
          this.removeFromListenerMap(_uuid)

          // Unsubscribe from video events
          await this.removeEvents()

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

  protected async addEvents() {
    const subscriptions = this.getSubscriptions()

    // TODO: Do not send already sent events

    const executeParams: ExecuteParams = {
      method: this.subscribeMethod,
      params: {
        ...this._subscribeParams,
        event_channel: this.eventChannel,
        events: subscriptions,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  protected async removeEvents() {
    // TODO: Remove only if no other listener is listening for these events
    // Or do not unsubsribe from the server, just switch off the listener
    const executeParams: ExecuteParams = {
      method: this.unsubscribeMethod,
      params: {
        event_channel: this.eventChannel,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }
}
