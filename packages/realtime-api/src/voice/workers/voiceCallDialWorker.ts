import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  CallingCallDialEvent,
} from '@signalwire/core'
// import { Call } from '../Call'
import {
  SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
  // SYNTHETIC_CALL_STATE_ENDED_EVENT,
} from './'

const TARGET_CALL_STATES = ['dialing', 'answered', 'failed']

export const voiceCallDialWorker: SDKWorker<any> = function* (
  options
): SagaIterator {
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  getLogger().trace('voiceCallDialWorker started')

  let run = true
  while (run) {
    const action: MapToPubSubShape<CallingCallDialEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        if (
          action.type === 'calling.call.dial' &&
          TARGET_CALL_STATES.includes(action.payload.dial_state)
        ) {
          // To avoid mixing events on `connect` we check for `instance.id`
          // if there's already a callId value.
          if (instance.id) {
            return instance.id === action.payload.call?.call_id
          }
          return instance.tag === action.payload.tag
        }
        return false
      })

    // Inject `tag` to have our EE to work because inbound calls don't have tags.
    const newPayload = {
      ...action.payload,
      tag: instance.tag,
    }

    console.log('>>> Payload from server', JSON.stringify(action.payload, null, 2));

    console.log('>>>>>>> newPayload', JSON.stringify(newPayload, null, 2));

    if (action.payload.dial_state === 'answered') {
      yield sagaEffects.put(pubSubChannel, {
        // @ts-expect-error
        type: SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
        // @ts-expect-error
        payload: newPayload,
      })
    }

    // else if (action.payload.dial_state === 'failed') {
    //   run = false

    //   yield sagaEffects.put(pubSubChannel, {
    //     // @ts-expect-error
    //     type: SYNTHETIC_CALL_STATE_ENDED_EVENT,
    //     // @ts-expect-error
    //     payload: newPayload,
    //   })
    // } else {
    //   throw new Error('[voiceCallDialWorker] unhandled call_state')
    // }
  }
  getLogger().trace('voiceCallDialWorker ended')
}
