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
  protected _subscribeParams?: Record<string, any> = {}
  protected _eventChannel?: string = ''
  private _subscribedEvents = new Map<
    string,
    EventEmitter.EventNames<EventTypes>[]
  >()

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
    const channelSubscribedEvents = this.getSubscribedEvents()

    // Filter out events that are already subscribed
    const newSubscriptions = subscriptions.filter(
      (event) => !channelSubscribedEvents?.includes(event)
    )

    if (!newSubscriptions.length) {
      // All events are already subscribed for this channel
      this._client.logger.debug('No new events to subscribe', subscriptions)
      return
    }

    const executeParams: ExecuteParams = {
      method: this.subscribeMethod,
      params: {
        get_initial_state: true,
        event_channel: this.eventChannel,
        events: newSubscriptions,
      },
    }
    const result = await this._client.execute<unknown, void>(executeParams)

    // Update subscribed events map
    this.updateSubscribedEvents(newSubscriptions)

    return result
  }

  private getSubscribedEvents() {
    if (!this.eventChannel) return []
    return this._subscribedEvents.get(this.eventChannel)
  }

  private updateSubscribedEvents(
    newSubscriptions: EventEmitter.EventNames<EventTypes>[]
  ) {
    if (!this.eventChannel) return
    if (this._subscribedEvents.has(this.eventChannel)) {
      const prevEvents = this._subscribedEvents.get(this.eventChannel) || []
      const newEvents = [...prevEvents, ...newSubscriptions]
      this._subscribedEvents.set(this.eventChannel, newEvents)
    } else {
      this._subscribedEvents.set(this.eventChannel, newSubscriptions)
    }
  }
}
