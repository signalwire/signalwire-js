import { request } from 'node:https'
import {
  EventEmitter,
  TaskInboundEvent,
  TaskReceivedEventName,
} from '@signalwire/core'
import { SWClient } from '../SWClient'
import { taskWorker } from './workers/taskWorker'
import { BaseListenOptions, BaseNamespace } from '../BaseNamespace'

const PATH = '/api/relay/rest/tasks'
const HOST = 'relay.signalwire.com'

interface TaskListenOptions extends BaseListenOptions {
  onTaskReceived?: (payload: TaskInboundEvent['message']) => unknown
}

type TaskListenersKeys = keyof Omit<TaskListenOptions, 'topics'>

export class Task extends BaseNamespace<TaskListenOptions> {
  protected emitter = new EventEmitter()
  protected _eventMap: Record<TaskListenersKeys, TaskReceivedEventName> = {
    onTaskReceived: 'task.received',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('taskWorker', {
      worker: taskWorker,
      initialState: {
        emitter: this.emitter,
      },
    })
  }

  send({
    topic,
    message,
  }: {
    topic: string
    message: Record<string, unknown>
  }) {
    const { userOptions } = this._sw
    if (!userOptions.project || !userOptions.token) {
      throw new Error('Invalid options: project and token are required!')
    }
    return new Promise<void>((resolve, reject) => {
      try {
        const Authorization = `Basic ${Buffer.from(
          `${userOptions.project}:${userOptions.token}`
        ).toString('base64')}`

        const data = JSON.stringify({ context: topic, message })
        const options = {
          host: userOptions.host ?? HOST,
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

export type { TaskReceivedEventName } from '@signalwire/core'
export type {
  TaskClientApiEvents,
  RealTimeTaskApiEventsHandlerMapping,
} from '../types'
