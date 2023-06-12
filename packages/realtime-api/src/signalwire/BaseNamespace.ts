import { uuid } from '@signalwire/core'
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
  private _baseListeners: BaseListeners<T>[] = []

  constructor(options: SWClient) {
    this._sw = options
    this._client = options.client
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

  protected async subscribe({ topics, ...listeners }: T) {
    const _uuid = uuid()

    // Attach listeners
    const listenerKeys = Object.keys(listeners) as Array<ListenersKeys>
    listenerKeys.forEach((key) => {
      if (typeof listeners[key] !== 'function' || !this._eventMap[key]) {
        return
      }
      this._client._on(this._eventMap[key], listeners[key])
    })
    await this._sw.addTopics(topics)

    const unsub = async () => {
      // Remove the topics
      const topicsToRemove = topics.filter((topic) => {
        const isUsed = this.hasOtherListeners(_uuid, topic)
        return !isUsed
      })
      if (topicsToRemove.length > 0) {
        await this._sw.removeTopics(topicsToRemove)
      }

      // Remove listeners
      listenerKeys.forEach((key) => {
        if (typeof listeners[key] !== 'function' || !this._eventMap[key]) {
          return
        }
        this._client._off(this._eventMap[key], listeners[key])
      })

      // Remove task from the task listener array
      this.removeBaseListener(_uuid)
    }

    this._baseListeners.push({ _uuid, topics, listeners, unsub })

    return unsub
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

  private removeBaseListener(id: string) {
    this._baseListeners = this._baseListeners.filter(
      (listener) => listener._uuid !== id
    )
  }
}
