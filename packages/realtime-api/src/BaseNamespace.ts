import { EventEmitter, ExecuteParams, uuid } from '@signalwire/core'
import { prefixEvent } from './utils/internals'
import { ListenSubscriber } from './ListenSubscriber'
import { SWClient } from './SWClient'

export interface ListenOptions {
  topics: string[]
}

export type Listeners = Omit<ListenOptions, 'topics'>

export type ListenersKeys = keyof Listeners

export class BaseNamespace<
  T extends ListenOptions,
  EventTypes extends EventEmitter.ValidEventTypes
> extends ListenSubscriber<Listeners, EventTypes> {
  constructor(options: SWClient) {
    super({ swClient: options })
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
    this._attachListenersWithTopics(topics, listeners)
    await this.addTopics(topics)

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Detach listeners
          this._detachListenersWithTopics(topics, listeners)

          // Remove topics from the listener map
          this.removeFromListenerMap(_uuid)

          // Remove the topics
          const topicsToRemove = topics.filter(
            (topic) => !this.hasOtherListeners(_uuid, topic)
          )
          if (topicsToRemove.length > 0) {
            await this.removeTopics(topicsToRemove)
          }

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    // Add topics to the listener map
    this.addToListenerMap(_uuid, {
      topics: new Set([...topics]),
      listeners,
      unsub,
    })

    return unsub
  }

  protected _attachListenersWithTopics(topics: string[], listeners: Listeners) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = prefixEvent(topic, this._eventMap[key])
          // @ts-expect-error
          this.on(event, listeners[key])
        }
      })
    })
  }

  protected _detachListenersWithTopics(topics: string[], listeners: Listeners) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = prefixEvent(topic, this._eventMap[key])
          // @ts-expect-error
          this.off(event, listeners[key])
        }
      })
    })
  }

  protected hasOtherListeners(uuid: string, topic: string) {
    for (const [key, listener] of this._listenerMap) {
      if (key !== uuid && listener.topics?.has(topic)) {
        return true
      }
    }
    return false
  }

  protected async unsubscribeAll() {
    await Promise.all(
      [...this._listenerMap.values()].map(({ unsub }) => unsub())
    )
    this._listenerMap.clear()
  }
}
