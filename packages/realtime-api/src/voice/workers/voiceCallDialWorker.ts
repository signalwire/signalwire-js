import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  CallingCallDialEvent,
} from '@signalwire/core'
import type { Call } from '../Call'
import {
  SYNTHETIC_CALL_DIAL_ANSWERED_EVENT,
  SYNTHETIC_CALL_DIAL_FAILED_EVENT,
} from './'

const TARGET_DIAL_STATES = ['answered', 'failed']

export const voiceCallDialWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  getLogger().trace('voiceCallDialWorker started')

  const action: MapToPubSubShape<CallingCallDialEvent> = yield sagaEffects.take(
    swEventChannel,
    (action: SDKActions) => {
      if (
        action.type === 'calling.call.dial' &&
        TARGET_DIAL_STATES.includes(action.payload.dial_state)
      ) {
        // To avoid mixing events on `connect` we check for `instance.id`
        // if there's already a callId value.
        if (instance.id) {
          return instance.id === action.payload.call?.call_id
        }
        return instance.tag === action.payload.tag
      }
      return false
    }
  )

  if (action.payload.dial_state === 'answered') {
    yield sagaEffects.put(pubSubChannel, {
      // @ts-expect-error
      type: SYNTHETIC_CALL_DIAL_ANSWERED_EVENT,
      // @ts-expect-error
      payload: action.payload,
    })
  } else if (action.payload.dial_state === 'failed') {
    yield sagaEffects.put(pubSubChannel, {
      // @ts-expect-error
      type: SYNTHETIC_CALL_DIAL_FAILED_EVENT,
      // @ts-expect-error
      payload: action.payload,
    })
  } else {
    throw new Error('[voiceCallDialWorker] unhandled call_state')
  }

  getLogger().trace('voiceCallDialWorker ended')
}
