import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
  VoiceCallReceiveAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { Call } from '../Call2'
import { prefixEvent } from '../../utils/internals'
import { Voice } from '../Voice2'

interface VoiceCallReceiveWorkerInitialState {
  voice: Voice
}

export const voiceCallReceiveWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set },
    initialState,
  } = options

  const { voice } = initialState as VoiceCallReceiveWorkerInitialState

  function* worker(action: VoiceCallReceiveAction) {
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

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.receive'
    )

    yield sagaEffects.fork(worker, action)
  }

  getLogger().trace('voiceCallReceiveWorker ended')
}
