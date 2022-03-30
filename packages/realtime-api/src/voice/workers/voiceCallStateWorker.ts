import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  CallingCallStateEvent,
  MapToPubSubShape,
} from '@signalwire/core'
import { Call } from '../Call'
import {
  SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
  SYNTHETIC_CALL_STATE_ENDED_EVENT,
} from './'

const TARGET_CALL_STATES = ['answered', 'failed', 'ended']

export const voiceCallStateWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  const { channels, instance } = options
  const { swEventChannel, pubSubChannel } = channels
  getLogger().trace('voiceCallStateWorker started')

  let isDone = false
  while (!isDone) {
    const action: MapToPubSubShape<CallingCallStateEvent> =
      yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
        return (
          action.type === 'calling.call.state' &&
          (instance.id === action.payload.call_id ||
            instance.tag === action.payload.tag) &&
          TARGET_CALL_STATES.includes(action.payload.call_state)
        )
      })

    // Inject `tag` to have our EE to work because inbound calls don't have tags.
    const newPayload = {
      tag: instance.tag,
      ...action.payload,
    }

    if (action.payload.call_state === 'answered') {
      yield sagaEffects.put(pubSubChannel, {
        // @ts-expect-error
        type: SYNTHETIC_CALL_STATE_ANSWERED_EVENT,
        // @ts-expect-error
        payload: newPayload,
      })
    } else if (action.payload.call_state === 'ended') {
      isDone = true

      yield sagaEffects.put(pubSubChannel, {
        // @ts-expect-error
        type: SYNTHETIC_CALL_STATE_ENDED_EVENT,
        // @ts-expect-error
        payload: newPayload,
      })
    } else {
      throw new Error('[voiceCallStateWorker] unhandled call_state')
    }
  }
  getLogger().trace('voiceCallStateWorker ended')
}
