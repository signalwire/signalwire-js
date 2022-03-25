import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
} from '@signalwire/core'
import type { Task } from './Task'

export const taskWorker: SDKWorker<Task> = function* (options): SagaIterator {
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels
  const action = yield sagaEffects.take(
    swEventChannel,
    (action: SDKActions) => {
      return action.type === 'queuing.relay.tasks'
    }
  )

  yield sagaEffects.put(pubSubChannel, {
    type: 'task.received',
    payload: action.payload.message,
  })
}
