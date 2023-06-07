import {
  DisconnectableClientContract,
  BaseComponentOptions,
  ClientContextContract,
  ApplyEventListeners,
} from '@signalwire/core'
import { connect } from '@signalwire/core'
import type { TaskClientApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { taskWorker } from './workers/taskWorker'

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
class TaskAPI extends ApplyEventListeners<TaskClientApiEvents> {
  constructor(options: BaseComponentOptions<TaskClientApiEvents>) {
    super(options)

    this.runWorker('taskWorker', {
      worker: taskWorker,
    })
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
