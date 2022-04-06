import type {
  DisconnectableClientContract,
  BaseComponentOptions,
} from '@signalwire/core'
import { connect, BaseComponent } from '@signalwire/core'
import type { RealTimeTaskApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { taskWorker } from './workers'

export interface Task
  extends DisconnectableClientContract<Task, RealTimeTaskApiEvents> {
  /** @internal */
  _session: RealtimeClient
}

/** @internal */
class TaskAPI extends BaseComponent<RealTimeTaskApiEvents> {
  constructor(options: BaseComponentOptions<RealTimeTaskApiEvents>) {
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
  params: BaseComponentOptions<RealTimeTaskApiEvents>
): Task => {
  const task = connect<RealTimeTaskApiEvents, TaskAPI, Task>({
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
