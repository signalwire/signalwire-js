import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
  VoiceCallReceiveAction,
  VoiceCallStateAction,
} from '@signalwire/core'
import { prefixEvent } from '../../utils/internals'
import type { Client } from '../../client/index'
import { Call } from '../Call'
import { Voice } from '../Voice'
import { handleCallStateEvents } from './handlers'

interface VoiceCallReceiveWorkerInitialState {
  voice: Voice
}

export const voiceCallReceiveWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const {
    channels: { swEventChannel },
    instanceMap,
    initialState,
  } = options

  const { voice } = initialState as VoiceCallReceiveWorkerInitialState

  function* callReceiveWorker(action: VoiceCallReceiveAction) {
    const { get, set } = instanceMap
    const { payload } = action

    // Contexts is required
    if (!payload.context || !payload.context.length) {
      throw new Error('Invalid context to receive inbound call')
    }

    let callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      callInstance = new Call({
        voice,
        payload,
      })
    } else {
      callInstance.setPayload(payload)
    }

    set<Call>(payload.call_id, callInstance)

    // @ts-expect-error
    voice.emit(prefixEvent(payload.context, 'call.received'), callInstance)
  }

  function* worker(action: VoiceCallReceiveAction | VoiceCallStateAction) {
    if (action.type === 'calling.call.receive') {
      yield sagaEffects.fork(callReceiveWorker, action)
    } else {
      handleCallStateEvents({
        payload: action.payload,
        voice,
        instanceMap,
      })
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => {
        return (
          action.type === 'calling.call.receive' ||
          (action.type === 'calling.call.state' &&
            action.payload.direction === 'inbound')
        )
      }
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('voiceCallReceiveWorker ended')
}
