import { EventEmitter, getLogger, uuid } from '@signalwire/core'
import type { Client } from './client/Client'
import { SWClient } from './SWClient'

export type ListenersKeys<T> = keyof T

export type ListenerMap<T> = Map<
  string,
  {
    listeners: T
    unsub: () => Promise<void>
  }
>

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

  /** @internal */
  emit(event: EventEmitter.EventNames<EventTypes>, ...args: any[]) {
    // @ts-expect-error
    return this.emitter.emit(event, ...args)
  }

  /** @internal */
  on<E extends EventEmitter.EventNames<EventTypes>>(
    event: E,
    fn: EventEmitter.EventListener<EventTypes, E>
  ) {
    return this.emitter.on(event, fn)
  }

  /** @internal */
  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.once(event, fn)
  }

  /** @internal */
  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.off(event, fn)
  }

  public listen(listeners: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
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

          // Remove topics from the listener map
          this.removeFromListenerMap(_uuid)

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    this._listenerMap.set(_uuid, {
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

  protected removeFromListenerMap(id: string) {
    return this._listenerMap.delete(id)
  }
}
