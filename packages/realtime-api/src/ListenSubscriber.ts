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
> extends EventEmitter<EventTypes> {
  /** @internal */
  _sw: SWClient

  protected _client: Client
  protected _listenerMap: ListenerMap<T> = new Map()
  protected _eventMap: Record<keyof T, keyof EventTypes>

  constructor(options: { swClient: SWClient }) {
    super()
    this._sw = options.swClient
    this._client = options.swClient.client
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

  private _attachListeners(listeners: T) {
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

  private _detachListeners(listeners: T) {
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
