import {
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
} from '@signalwire/core'
import type { Task } from './Task'

export const SYNTHETIC_MEMBER_LIST_UPDATED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

export const taskWorker: SDKWorker<Task> = function* (options): SagaIterator {
  const { channels } = options
  const { swEventChannel, pubSubChannel } = channels
  const action = yield sagaEffects.take(swEventChannel, (action: any) => {
    return action.type === 'queuing.relay.tasks'
  })

  console.log('---> action', action)

  // TODO: this should be conditional
  yield sagaEffects.put(pubSubChannel, {
    // @ts-expect-error
    type: 'task.inbound',
    payload: action.payload.message,
  })
}
