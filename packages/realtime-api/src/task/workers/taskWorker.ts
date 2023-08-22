import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  TaskAction,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'
import type { Client } from '../../client/Client'
import { Task } from '../Task'

interface TaskWorkerInitialState {
  task: Task
}

export const taskWorker: SDKWorker<Client> = function* (options): SagaIterator {
  getLogger().trace('taskWorker started')
  const {
    channels: { swEventChannel },
    initialState,
  } = options

  const { task } = initialState as TaskWorkerInitialState

  function* worker(action: TaskAction) {
    const { context } = action.payload

    // @ts-expect-error
    task.emit(prefixEvent(context, 'task.received'), action.payload.message)
  }

  const isTaskEvent = (action: SDKActions) =>
    action.type === 'queuing.relay.tasks'

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, isTaskEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('taskWorker ended')
}
