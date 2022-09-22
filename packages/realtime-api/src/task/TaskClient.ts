import type { UserOptions } from '@signalwire/core'
import { setupClient, clientConnect } from '../client/index'
import type { Task } from './Task'
import { createTaskObject } from './Task'
import { clientContextInterceptorsFactory } from '../common/clientContext'

interface TaskClient extends Task {
  new (opts: TaskClientOptions): this
}

export interface TaskClientOptions
  extends Omit<UserOptions, '_onRefreshToken'> {
  contexts: string[]
}

/**
 * Creates a new Task client.
 *
 * @param options - {@link TaskClientOptions}
 *
 * @example
 *
 * ```js
 * import { Task } from '@signalwire/realtime-api'
 *
 * const taskClient = new Task.Client({
 *   project: '<project-id>',
 *   token: '<api-token>',
 *   contexts: ['<context-name>'],
 * })
 * ```
 */
const TaskClient = function (options?: TaskClientOptions) {
  const { client, store, emitter } = setupClient(options)

  const task = createTaskObject({
    store,
    emitter,
  })

  const disconnect = () => client.disconnect()

  const interceptors = {
    ...clientContextInterceptorsFactory(client),
    _session: client,
    disconnect,
  } as const

  return new Proxy<Omit<TaskClient, 'new'>>(task, {
    get(target: TaskClient, prop: keyof TaskClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      // Always connect the underlying client if the user call a function on the Proxy
      if (typeof target[prop] === 'function') {
        clientConnect(client)
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options?: TaskClientOptions): TaskClient }

export { TaskClient as Client }
