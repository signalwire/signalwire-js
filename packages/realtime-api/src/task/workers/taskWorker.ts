import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  TaskAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'

export const taskWorker: SDKWorker<Client> = function* (options): SagaIterator {
  getLogger().trace('taskWorker started')
  const {
    channels: { swEventChannel },
    initialState: { emitter },
  } = options

  function* worker(action: TaskAction) {
    const { context } = action.payload

    emitter.emit(`${context}.task.received`, action.payload.message)
  }

  const isTaskEvent = (action: SDKActions) =>
    action.type === 'queuing.relay.tasks'

  while (true) {
    const action = yield sagaEffects.take(swEventChannel, isTaskEvent)

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('taskWorker ended')
}
