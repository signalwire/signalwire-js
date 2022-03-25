import {
  findNamespaceInPayload,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  toSyntheticEvent,
} from '@signalwire/core'

export const SYNTHETIC_CALL_STATE_ANSWERED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

export const SYNTHETIC_CALL_STATE_FAILED_EVENT = toSyntheticEvent(
  'calling.call.failed'
)

export const SYNTHETIC_CALL_STATE_ENDED_EVENT =
  toSyntheticEvent('calling.call.ended')

const TARGET_CALL_STATES = ['answered', 'failed', 'ended']

export const voiceCallStateWorker: SDKWorker<any> = function* (
  options
): SagaIterator {
  let isDone = false
  while (!isDone) {
    const { channels, instance } = options
    const { swEventChannel } = channels
    const action = yield sagaEffects.take(swEventChannel, (action: any) => {
      return (
        action.type === 'calling.call.state' &&
        findNamespaceInPayload(action) === instance.__uuid &&
        TARGET_CALL_STATES.includes(action.payload.call_state)
      )
    })

    if (action.payload.call_state === 'answered') {
      yield sagaEffects.put(channels.pubSubChannel, {
        type: SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
        payload: action.payload,
      })
    } else if (action.payload.call_state === 'failed') {
      yield sagaEffects.put(channels.pubSubChannel, {
        type: SYNTHETIC_CALL_STATE_FAILED_EVENT,
        payload: action.payload,
      })
    } else if (action.payload.call_state === 'ended') {
      isDone = true

      yield sagaEffects.put(channels.pubSubChannel, {
        type: SYNTHETIC_CALL_STATE_ENDED_EVENT,
        payload: action.payload,
      })
    } else {
      throw new Error('[voiceCallStateWorker] unhandled call_state')
    }
  }
}
