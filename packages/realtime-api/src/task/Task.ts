import {
  DisconnectableClientContract,
  BaseComponentOptions,
  BaseComponent,
  ClientContextContract,
} from '@signalwire/core'
import { connect } from '@signalwire/core'
import type { TaskClientApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { taskWorker } from './workers'

export interface Task
  extends DisconnectableClientContract<Task, TaskClientApiEvents>,
    ClientContextContract {
  /** @internal */
  _session: RealtimeClient
  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void
}

/** @internal */
class TaskAPI extends BaseComponent<TaskClientApiEvents> {
  constructor(options: BaseComponentOptions) {
    super(options)

    this.runWorker('taskWorker', {
      worker: taskWorker,
    })
  }
}

/** @internal */
export const createTaskObject = (params: BaseComponentOptions): Task => {
  const task = connect<TaskClientApiEvents, TaskAPI, Task>({
    store: params.store,
    Component: TaskAPI,
  })(params)

  return task
}

export * from './TaskClient'
export * from './send'
export type { TaskReceivedEventName } from '@signalwire/core'
export type {
  TaskClientApiEvents,
  RealTimeTaskApiEventsHandlerMapping,
} from '../types'
