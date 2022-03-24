import type { AssertSameType, UserOptions } from '@signalwire/core'
import { setupClient, clientConnect, RealtimeClient } from '../client/index'
import { TaskClientDocs } from './TaskClient.docs'
import type { Task } from './Task'
import { createTaskObject } from './Task'

interface TaskClientMain extends Task {
  new (opts: TaskClientOptions): this
}

interface TaskClient extends AssertSameType<TaskClientMain, TaskClientDocs> {}

/** @ignore */
export interface TaskClientOptions
  extends Omit<UserOptions, '_onRefreshToken'> {}

/** @ignore */
const TaskClient = function (options?: TaskClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const task = createTaskObject({
    store,
    emitter,
  })

  const clientOn: RealtimeClient['on'] = (...args) => {
    clientConnect(client)

    return client.on(...args)
  }
  const clientOnce: RealtimeClient['once'] = (...args) => {
    clientConnect(client)

    return client.once(...args)
  }

  const interceptors = {
    on: clientOn,
    once: clientOnce,
    _session: client,
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
