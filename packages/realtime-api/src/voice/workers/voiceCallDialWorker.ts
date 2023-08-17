import {
  getLogger,
  SagaIterator,
  SDKWorker,
  sagaEffects,
  VoiceCallDialAction,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'
import { SDKActions } from 'packages/core/dist/core/src'
import { Voice } from '../Voice'

interface VoiceCallDialWorkerInitialState {
  tag: string
  voice: Voice
}

export const voiceCallDialWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    instanceMap: { get },
    channels: { swEventChannel },
    initialState,
  } = options

  const { tag, voice } = initialState as VoiceCallDialWorkerInitialState

  function* worker(action: VoiceCallDialAction) {
    const { payload } = action

    // Inbound calls do not have the tag
    if (payload.tag && payload.tag !== tag) return

    switch (payload.dial_state) {
      case 'failed': {
        // @ts-expect-error
        voice.emit('dial.failed', payload)
        return true
      }
      case 'answered': {
        const callInstance = get<Call>(payload.call.call_id)
        callInstance.setPayload(payload.call)
        // @ts-expect-error
        voice.emit('dial.answered', callInstance)
        return true
      }
      default:
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.dial'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallDialWorker ended')
}
