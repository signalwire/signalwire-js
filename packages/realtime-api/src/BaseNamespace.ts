import { EventEmitter, ExecuteParams, uuid } from '@signalwire/core'
import type { Client } from './client/Client'
import { SWClient } from './SWClient'
import { prefixEvent } from './utils/internals'

export interface ListenOptions {
  topics: string[]
}

export type ListenersKeys = keyof Omit<ListenOptions, 'topics'>

type ListenerMap = Map<
  string,
  {
    topics: Set<string>
    listeners: Omit<ListenOptions, 'topics'>
    unsub: () => Promise<void>
  }
>

export class BaseNamespace<T extends ListenOptions> {
  protected _client: Client
  protected _sw: SWClient
  protected _eventMap: Record<ListenersKeys, string> = {}
  private _namespaceEmitter = new EventEmitter()
  protected _listenerMap: ListenerMap = new Map()

  constructor(options: { swClient: SWClient }) {
    this._sw = options.swClient
    this._client = options.swClient.client
  }

  protected get emitter() {
    return this._namespaceEmitter
  }

  protected addTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.receive',
      params: {
        contexts: topics,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  protected removeTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.unreceive',
      params: {
        contexts: topics,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  public listen(listenOptions: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
        const { topics } = listenOptions
        if (!Array.isArray(topics) || topics?.length < 1) {
          throw new Error(
            'Invalid options: topics should be an array with at least one topic!'
          )
        }
        const unsub = await this.subscribe(listenOptions)
        resolve(unsub)
      } catch (error) {
        reject(error)
      }
    })
  }

  protected async subscribe(listenOptions: T) {
    const { topics, ...listeners } = listenOptions
    const _uuid = uuid()

    // Attach listeners
    this._attachListeners(topics, listeners)
    await this.addTopics(topics)

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Remove the topics
          const topicsToRemove = topics.filter(
            (topic) => !this.hasOtherListeners(_uuid, topic)
          )
          if (topicsToRemove.length > 0) {
            await this.removeTopics(topicsToRemove)
          }

          // Detach listeners
          this._detachListeners(topics, listeners)

          // Remove topics from the listener map
          this.removeFromListenerMap(_uuid)

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    this._listenerMap.set(_uuid, {
      topics: new Set([...topics]),
      listeners,
      unsub,
    })

    return unsub
  }

  protected _attachListeners(topics: string[], listeners: Omit<T, 'topics'>) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = prefixEvent(topic, this._eventMap[key])
          this.emitter.on(event, listeners[key])
        }
      })
    })
  }

  protected _detachListeners(topics: string[], listeners: Omit<T, 'topics'>) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = prefixEvent(topic, this._eventMap[key])
          this.emitter.off(event, listeners[key])
        }
      })
    })
  }

  protected hasOtherListeners(uuid: string, topic: string) {
    for (const [key, listener] of this._listenerMap) {
      if (key !== uuid && listener.topics.has(topic)) return true
    }
    return false
  }

  protected async unsubscribeAll() {
    await Promise.all(
      [...this._listenerMap.values()].map(({ unsub }) => unsub())
    )
    this._listenerMap.clear()
  }

  protected removeFromListenerMap(id: string) {
    return this._listenerMap.delete(id)
  }
}
