import { request } from 'node:https'
import { TaskInboundEvent } from '@signalwire/core'
import { SWClient } from '../SWClient'
import { taskWorker } from '../../task/workers/taskWorker'

const PATH = '/api/relay/rest/tasks'
const HOST = 'relay.signalwire.com'

export interface TaskListenOptions {
  topics: string[]
  onTaskReceived?: (payload: TaskInboundEvent['message']) => unknown
}

export type TaskListeners = Omit<TaskListenOptions, 'topic'>

export class Task {
  private _client
  private _sw
  private listeners: {
    key: keyof TaskListeners
    event: string
  }[] = [{ key: 'onTaskReceived', event: 'task.received' }]

  constructor(options: SWClient) {
    this._sw = options
    this._client = options.client

    this._client.runWorker('taskWorker', {
      worker: taskWorker,
    })
  }

  private subscribeListeners(listeners: TaskListeners) {
    this.listeners.forEach(({ key, event }) => {
      // @ts-expect-error
      this._client._on(event, listeners[key])
    })
    const unsubscribe = () => {
      this.listeners.forEach(({ key, event }) => {
        // @ts-expect-error
        this._client._off(event, listeners[key])
      })
    }
    return unsubscribe
  }

  listen(listenOptions: TaskListenOptions) {
    return new Promise<() => void>(async (resolve, reject) => {
      try {
        const { topics } = listenOptions
        await this._sw.addTopics(topics)
        const unsubscribe = this.subscribeListeners(listenOptions)
        resolve(unsubscribe)
      } catch (error) {
        reject(error)
      }
    })
  }

  send({
    topic,
    message,
  }: {
    topic: string
    message: Record<string, unknown>
  }) {
    if (!this._sw.userOptions.project || !this._sw.userOptions.token) {
      throw new Error('Invalid options: project and token are required!')
    }
    return new Promise<void>((resolve, reject) => {
      try {
        const Authorization = `Basic ${Buffer.from(
          `${this._sw.userOptions.project}:${this._sw.userOptions.token}`
        ).toString('base64')}`

        const data = JSON.stringify({ context: topic, message })
        const options = {
          host: this._sw.userOptions.host ?? HOST,
          port: 443,
          method: 'POST',
          path: PATH,
          headers: {
            Authorization,
            'Content-Type': 'application/json',
            'Content-Length': data.length,
          },
        }
        const req = request(options, ({ statusCode }) => {
          statusCode === 204 ? resolve() : reject()
        })

        req.on('error', reject)

        req.write(data)
        req.end()
      } catch (error) {
        reject(error)
      }
    })
  }
}
