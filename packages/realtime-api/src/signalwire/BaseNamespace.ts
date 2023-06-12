import { EventEmitter, ExecuteParams, uuid } from '@signalwire/core'
import type { Client } from '../client/Client'
import { SWClient } from './SWClient'

export interface BaseListenOptions {
  topics: string[]
}

type ListenersKeys = keyof Omit<BaseListenOptions, 'topics'>

interface BaseListeners<T> {
  _uuid: string
  topics: BaseListenOptions['topics']
  listeners: Omit<T, 'topics'>
  unsub: () => Promise<void>
}

export class BaseNamespace<T extends BaseListenOptions> {
  protected _client: Client
  protected _sw: SWClient
  protected _eventMap: Record<ListenersKeys, string>
  protected emitter = new EventEmitter()
  private _baseListeners: BaseListeners<T>[] = []

  constructor(options: SWClient) {
    this._sw = options
    this._client = options.client
  }

  private addTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.receive',
      params: {
        contexts: topics,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  private removeTopics(topics: string[]) {
    const executeParams: ExecuteParams = {
      method: 'signalwire.unreceive',
      params: {
        contexts: topics,
      },
    }
    return this._client.execute<unknown, void>(executeParams)
  }

  listen(listenOptions: T) {
    return new Promise<() => Promise<void>>(async (resolve, reject) => {
      try {
        const { topics } = listenOptions
        if (topics?.length < 1) {
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

          // Remove listeners
          this._detachListeners(topics, listeners)

          // Remove task from the task listener array
          this.removeFromBaseListener(_uuid)

          resolve()
        } catch (error) {
          reject(error)
        }
      })
    }

    this._baseListeners.push({ _uuid, topics, listeners, unsub })

    return unsub
  }

  private _attachListeners(topics: string[], listeners: Omit<T, 'topics'>) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>

    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = `${topic}.${this._eventMap[key]}`
          this.emitter.on(event, listeners[key])
        }
      })
    })
  }

  private _detachListeners(topics: string[], listeners: Omit<T, 'topics'>) {
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>

    topics.forEach((topic) => {
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] === 'function' && this._eventMap[key]) {
          const event = `${topic}.${this._eventMap[key]}`
          this.emitter.off(event, listeners[key])
        }
      })
    })
  }

  private hasOtherListeners(uuid: string, topic: string) {
    const otherTasks = this._baseListeners.filter((task) => task._uuid !== uuid)
    for (const task of otherTasks) {
      if (task.topics.includes(topic)) {
        return true
      }
    }
    return false
  }

  protected unsubscribeAll() {
    this._baseListeners.forEach(async ({ unsub }) => await unsub())
    this._baseListeners = []
  }

  private removeFromBaseListener(id: string) {
    this._baseListeners = this._baseListeners.filter(
      (listener) => listener._uuid !== id
    )
  }
}
