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
  const { channels, instance, onDone, onFail } = options
  const { swEventChannel } = channels
  getLogger().trace('voiceCallSendDigitsWorker started')

  const action: MapToPubSubShape<CallingCallSendDigitsEvent> =
    yield sagaEffects.take(swEventChannel, (action: SDKActions) => {
      if (
        action.type === 'calling.call.send_digits' &&
        TARGET_STATES.includes(action.payload.state)
      ) {
        return instance.callId === action.payload.call_id
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
