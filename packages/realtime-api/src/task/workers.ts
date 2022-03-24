import { sagaEffects, SagaIterator, SDKWorker } from '@signalwire/core'
import type { Task } from './Task'

export const taskWorker: SDKWorker<Task> = function* (options): SagaIterator {
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels
  const action = yield sagaEffects.take(swEventChannel, (action: any) => {
    return action.type === 'queuing.relay.tasks'
  })

  yield sagaEffects.put(pubSubChannel, {
    // @ts-expect-error
    type: 'task.inbound',
    payload: action.payload.message,
  })
}
