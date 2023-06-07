import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  TaskAction,
} from '@signalwire/core'
import type { Client } from '../client/index'

export const taskWorker: SDKWorker<Client> = function* (options): SagaIterator {
  getLogger().trace('taskWorker started')
  const {
    instance: client,
    channels: { swEventChannel },
  } = options

  function* worker(action: TaskAction) {
    // @ts-expect-error
    client.baseEmitter.emit('task.received', action.payload.message)
  }

  const isTaskEvent = (action: SDKActions) =>
    action.type === 'queuing.relay.tasks'

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, isTaskEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('taskWorker ended')
}
