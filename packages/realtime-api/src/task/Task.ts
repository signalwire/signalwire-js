import type { ConsumerContract, BaseComponentOptions } from '@signalwire/core'
import { connect, BaseConsumer } from '@signalwire/core'
import type { TaskClientApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { taskWorker } from './workers'

export interface Task extends ConsumerContract<TaskClientApiEvents> {
  /** @internal */
  _session: RealtimeClient
}

/** @internal */
class TaskAPI extends BaseConsumer<TaskClientApiEvents> {
  constructor(options: BaseComponentOptions<TaskClientApiEvents>) {
    super(options)

    this.setWorker('taskWorker', {
      worker: taskWorker,
    })
    this.attachWorkers()
    this._attachListeners('')
  }
}

/** @internal */
export const createTaskObject = (
  params: BaseComponentOptions<TaskClientApiEvents>
): Task => {
  const task = connect<TaskClientApiEvents, TaskAPI, Task>({
    store: params.store,
    Component: TaskAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return task
}

export * from './TaskClient'
export * from './send'
export { TaskClientApiEvents } from '../types'
