import type { AssertSameType, UserOptions } from '@signalwire/core'
import { setupClient, clientConnect } from '../client/index'
import { TaskClientDocs } from './TaskClient.docs'
import type { Task } from './Task'
import { createTaskObject } from './Task'
import { clientContextInterceptorsFactory } from '../common/clientContext'

interface TaskClientMain extends Task {
  new (opts: TaskClientOptions): this
}

interface TaskClient extends AssertSameType<TaskClientMain, TaskClientDocs> {}

/** @ignore */
export interface TaskClientOptions
  extends Omit<UserOptions, '_onRefreshToken'> {
  contexts: string[]
}

/** @ignore */
const TaskClient = function (options?: TaskClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const task = createTaskObject({
    store,
    emitter,
  })

  const taskOn: TaskClient['on'] = (...args) => {
    clientConnect(client)

    return task.on(...args)
  }
  const taskOnce: TaskClient['once'] = (...args) => {
    clientConnect(client)

    return task.once(...args)
  }
  const disconnect = () => client.disconnect()

  const interceptors = {
    ...clientContextInterceptorsFactory(client),
    on: taskOn,
    once: taskOnce,
    _session: client,
    disconnect,
  } as const

  return new Proxy<Omit<TaskClient, 'new'>>(task, {
    get(target, prop, receiver) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: TaskClientOptions): TaskClient }

export { TaskClient as Client }
