import { EventEmitter, ExecuteParams, getLogger, uuid } from '@signalwire/core'
import { prefixEvent } from './utils/internals'
import { ListenSubscriber } from './ListenSubscriber'
import { SWClient } from './SWClient'

export interface ListenOptions {
  topics?: string[]
  channels?: string[]
}

export type Listeners<T> = Omit<T, 'topics' | 'channels'>

export type ListenersKeys<T> = keyof T

export class BaseNamespace<
  T extends ListenOptions,
  EventTypes extends EventEmitter.ValidEventTypes
> extends ListenSubscriber<Listeners<T>, EventTypes> {
  constructor(options: SWClient) {
    super({ swClient: options })

    this.onSessionReconnect = this.onSessionReconnect.bind(this)
    this.onSessionDisconnect = this.onSessionDisconnect.bind(this)
    this._client.session.on('session.reconnecting', this.onSessionReconnect)
    this._client.session.once('session.disconnected', this.onSessionDisconnect)
  }

  protected onSessionReconnect() {
    this._client.session.once('session.connected', async () => {
      const resendTopics = new Set<string>()
      for (const { topics } of this._listenerMap.values()) {
        topics?.forEach((topic) => resendTopics.add(topic))
      }
      if (resendTopics.size > 0) {
        getLogger().info('Re-subscribing topics after reconnection')
        await this.addTopics([...resendTopics])
      }
    })
  }

  private onSessionDisconnect() {
    this._client.session.off('session.reconnecting', this.onSessionReconnect)
    this._client.destroy()
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
    this._attachListenersWithTopics(topics!, listeners as Listeners<T>)
    await this.addTopics(topics!)

    const unsub = () => {
      return new Promise<void>(async (resolve, reject) => {
        try {
          // Detach listeners
          this._detachListenersWithTopics(topics!, listeners as Listeners<T>)

          // Remove topics from the listener map
          this.removeFromListenerMap(_uuid)

          // Remove the topics
          const topicsToRemove = topics!.filter(
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
      topics: new Set([...topics!]),
      listeners: listeners as Listeners<T>,
      unsub,
    })

    return unsub
  }

  protected _attachListenersWithTopics(
    topics: string[],
    listeners: Listeners<T>
  ) {
    const listenerKeys = Object.keys(listeners)
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        const _key = key as keyof Listeners<T>
        if (typeof listeners[_key] === 'function' && this._eventMap[_key]) {
          const event = prefixEvent(topic, this._eventMap[_key] as string)
          // @ts-expect-error
          this.on(event, listeners[_key])
        }
      })
    })
  }

  protected _areListenersAttached(topics: string[], listeners: Listeners<T>) {
    return topics.every((topic) =>
      Object.entries(listeners).every(([key, listener]) => {
        const event = prefixEvent(
          topic,
          this._eventMap[key as keyof Listeners<T>] as string
        )
        // @ts-expect-error
        return this.emitter.listeners(event).includes(listener)
      })
    )
  }

  protected _detachListenersWithTopics(
    topics: string[],
    listeners: Listeners<T>
  ) {
    const listenerKeys = Object.keys(listeners)
    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        const _key = key as keyof Listeners<T>
        if (typeof listeners[_key] === 'function' && this._eventMap[_key]) {
          const event = prefixEvent(topic, this._eventMap[_key] as string)
          // @ts-expect-error
          this.off(event, listeners[_key])
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
