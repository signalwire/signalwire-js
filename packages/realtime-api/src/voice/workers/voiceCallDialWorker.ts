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

const TARGET_DIAL_STATES: CallingCallDialEvent['params']['dial_state'][] = [
  'answered',
  'failed',
]

export const voiceCallDialWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  const { channels, instance, onDone, onFail } = options
  const { swEventChannel } = channels
  getLogger().trace('voiceCallDialWorker started')

  const action: MapToPubSubShape<CallingCallDialEvent> = yield sagaEffects.take(
    swEventChannel,
    (action: SDKActions) => {
      if (
        action.type === 'calling.call.dial' &&
        TARGET_DIAL_STATES.includes(action.payload.dial_state)
      ) {
        return instance.tag === action.payload.tag
      }
      return false
    }
  )

  if (action.payload.dial_state === 'answered') {
    onDone?.()
  } else if (action.payload.dial_state === 'failed') {
    onFail?.()
  } else {
    throw new Error('[voiceCallDialWorker] unhandled call_state')
  }

  getLogger().trace('voiceCallDialWorker ended')
}
