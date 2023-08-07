import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
} from '@signalwire/core'
import type { Task } from './Task'

export const taskWorker: SDKWorker<Task> = function* (options): SagaIterator {
  getLogger().trace('taskWorker started')
  const { channels, instance } = options
  const { swEventChannel } = channels

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return action.type === 'queuing.relay.tasks'
      }
    )

    instance.emit('task.received', action.payload.message)
  }

  getLogger().trace('taskWorker ended')
}
