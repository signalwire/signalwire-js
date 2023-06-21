import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  TaskAction,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'
import { Task } from '../Task'

export const taskWorker: SDKWorker<Task> = function* (options): SagaIterator {
  getLogger().trace('taskWorker started')
  const {
    channels: { swEventChannel },
    initialState: { taskEmitter },
  } = options

  function* worker(action: TaskAction) {
    const { context } = action.payload

    taskEmitter.emit(
      prefixEvent(context, 'task.received'),
      action.payload.message
    )
  }

  const isTaskEvent = (action: SDKActions) =>
    action.type === 'queuing.relay.tasks'

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, isTaskEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('taskWorker ended')
}