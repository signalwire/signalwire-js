import { request } from 'node:https'
import { TaskInboundEvent } from '@signalwire/core'
import { SWClient } from '../SWClient'
import { taskWorker } from '../../task/workers/taskWorker'
import { BaseListenOptions, BaseNamespace } from '../BaseNamespace'

const PATH = '/api/relay/rest/tasks'
const HOST = 'relay.signalwire.com'

interface TaskListenOptions extends BaseListenOptions {
  onTaskReceived?: (payload: TaskInboundEvent['message']) => unknown
  onTaskDeleted?: (payload: TaskInboundEvent['message']) => unknown
}

type TaskListenersKeys = keyof Omit<TaskListenOptions, 'topics'>

export class Task extends BaseNamespace<TaskListenOptions> {
  protected _eventMap: Record<TaskListenersKeys, string> = {
    onTaskReceived: 'task.received',
    onTaskDeleted: 'task.deleted',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('taskWorker', {
      worker: taskWorker,
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
