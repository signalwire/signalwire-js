import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  SDKActions,
  MapToPubSubShape,
  CallingCallSendDigitsEvent,
} from '@signalwire/core'
import type { Call } from '../Call'

const TARGET_STATES: CallingCallSendDigitsEvent['params']['state'][] = [
  'finished',
]

export const voiceCallSendDigitsWorker: SDKWorker<Call> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallSendDigitsWorker started')
  const { channels, instance, onDone, onFail, initialState = {} } = options
  const { swEventChannel } = channels
  const { controlId } = initialState

  if (!controlId) {
    throw new Error('Missing controlId for sendDigits')
  }

  const action: MapToPubSubShape<CallingCallSendDigitsEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (
        action.type === 'calling.call.send_digits' &&
        TARGET_STATES.includes(action.payload.state)
      ) {
        return (
          instance.callId === action.payload.call_id &&
          action.payload.control_id === controlId
        )
      }
      return false
    })

  if (action.payload.state === 'finished') {
    onDone?.()
  } else {
    const error = new Error('[voiceCallSendDigitsWorker] unhandled state')
    if (typeof onFail === 'function') {
      onFail(error)
    } else {
      throw error
    }
  }

  getLogger().trace('voiceCallSendDigitsWorker ended')
}
