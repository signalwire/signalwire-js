import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  VoiceCallSendDigitsAction,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'
import { SDKActions } from 'packages/core/dist/core/src'

interface VoiceCallSendDigitsWorkerInitialState {
  controlId: string
}

export const voiceCallSendDigitsWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallSendDigitsWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get },
    initialState,
  } = options

  const { controlId } = initialState as VoiceCallSendDigitsWorkerInitialState

  function* worker(action: VoiceCallSendDigitsAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for send digits')
    }

    switch (payload.state) {
      case 'finished':
        // @ts-expect-error
        callInstance.emit('send_digits.finished', callInstance)
        return true
      default: {
        const error = new Error(
          `[voiceCallSendDigitsWorker] unhandled state: '${payload.state}'`
        )
        // @ts-expect-error
        callInstance.emit('send_digits.failed', error)
        return false
      }
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.send_digits'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallSendDigitsWorker ended')
}
