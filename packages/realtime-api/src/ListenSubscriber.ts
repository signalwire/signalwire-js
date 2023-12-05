import { EventEmitter, getLogger, uuid } from '@signalwire/core'
import type { Client } from './client/Client'
import { SWClient } from './SWClient'

export type ListenersKeys<T> = keyof T

export type ListenerMapValue<T> = {
  topics?: Set<string>
  listeners: T
  unsub: () => Promise<void>
}

export type ListenerMap<T> = Map<string, ListenerMapValue<T>>

export class ListenSubscriber<
  T extends {},
  EventTypes extends EventEmitter.ValidEventTypes
> {
  /** @internal */
  _sw: SWClient

  protected _client: Client
  protected _listenerMap: ListenerMap<T> = new Map()
  protected _eventMap: Record<keyof T, keyof EventTypes>
  private _emitter = new EventEmitter<EventTypes>()

  constructor(options: { swClient: SWClient }) {
    this._sw = options.swClient
    this._client = options.swClient.client
  }

  protected get emitter() {
    return this._emitter
  }

  protected eventNames() {
    return this.emitter.eventNames()
  }

  /** @internal */
  emit<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    ...args: EventEmitter.EventArgs<EventTypes, T>
  ) {
    return this.emitter.emit(event, ...args)
  }

  protected on<E extends EventEmitter.EventNames<EventTypes>>(
    event: E,
    fn: EventEmitter.EventListener<EventTypes, E>
  ) {
    return this.emitter.on(event, fn)
  }

  protected once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.once(event, fn)
  }

  protected off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.off(event, fn)
  }

  public listen(listeners: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
        if (
          !listeners ||
          listeners?.constructor !== Object ||
          Object.keys(listeners).length < 1
        ) {
          throw new Error('Invalid params!')
        }

        const unsub = await this.subscribe(listeners)
        resolve(unsub)
      } catch (error) {
        reject(error)
      }
    })
  }

  protected async subscribe(listeners: T) {
    const _uuid = uuid()

    // Attach listeners
    this._attachListeners(listeners)

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

  protected _attachListeners(listeners: T) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys<T>>
    listenerKeys.forEach((key) => {
      if (typeof listeners[key] === 'function' && this._eventMap[key]) {
        // @ts-expect-error
        this.on(this._eventMap[key], listeners[key])
      } else {
        getLogger().warn(`Unsupported listener: ${listeners[key]}`)
      }
    })
  }

  protected _detachListeners(listeners: T) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys<T>>
    listenerKeys.forEach((key) => {
      if (typeof listeners[key] === 'function' && this._eventMap[key]) {
        // @ts-expect-error
        this.off(this._eventMap[key], listeners[key])
      }
    })
  }

  protected addToListenerMap(id: string, value: ListenerMapValue<T>) {
    return this._listenerMap.set(id, value)
  }

  protected removeFromListenerMap(id: string) {
    return this._listenerMap.delete(id)
  }
}
