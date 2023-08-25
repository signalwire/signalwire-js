import {
  getLogger,
  SagaIterator,
  SDKWorker,
  sagaEffects,
  VoiceCallDialAction,
  VoiceCallStateAction,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { Client } from '../../client/index'
import { RealTimeCallListeners } from '../../types'
import { SDKActions } from 'packages/core/dist/core/src'
import { Voice } from '../Voice'
import { handleCallStateEvents } from './handlers'

interface VoiceCallDialWorkerInitialState {
  tag: string
  voice: Voice
  listeners?: RealTimeCallListeners
}

export const voiceCallDialWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    instanceMap,
    channels: { swEventChannel },
    initialState,
  } = options

  const { tag, voice, listeners } =
    initialState as VoiceCallDialWorkerInitialState

  function* callDialWorker(action: VoiceCallDialAction) {
    const { get } = instanceMap
    const { payload } = action

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

  function* worker(action: VoiceCallDialAction | VoiceCallStateAction) {
    if (action.type === 'calling.call.dial') {
      yield sagaEffects.fork(callDialWorker, action)
      return false
    } else {
      return handleCallStateEvents({
        payload: action.payload,
        voice,
        instanceMap,
        listeners,
      })
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return (
          (action.type === 'calling.call.dial' && action.payload.tag === tag) ||
          (action.type === 'calling.call.state' &&
            action.payload.direction === 'outbound' &&
            action.payload.tag === tag)
        )
      }
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallDialWorker ended')
}
