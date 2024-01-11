import {
  getLogger,
  SagaIterator,
  sagaEffects,
  SDKActions,
  SDKWorker,
  VoiceCallTapAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { CallTapListeners } from '../../types'
import type { Call } from '../Call'
import { CallTap } from '../CallTap'

interface VoiceCallTapWorkerInitialState {
  controlId: string
  listeners?: CallTapListeners
}

export const voiceCallTapWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallTapWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { controlId, listeners } =
    initialState as VoiceCallTapWorkerInitialState

  function* worker(action: VoiceCallTapAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    const callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for tap')
    }

    let tapInstance = get<CallTap>(payload.control_id)
    if (!tapInstance) {
      tapInstance = new CallTap({
        call: callInstance,
        payload,
        listeners,
      })
    } else {
      tapInstance.setPayload(payload)
    }
    set(payload.control_id, tapInstance)

    switch (payload.state) {
      case 'tapping':
        callInstance.emit('tap.started', tapInstance)
        tapInstance.emit('tap.started', tapInstance)
        return false
      case 'finished':
        callInstance.emit('tap.ended', tapInstance)
        tapInstance.emit('tap.ended', tapInstance)
        remove<CallTap>(payload.control_id)
        return true
      default:
        getLogger().warn(`Unknown tap state: "${payload.state}"`)
        return false
    }
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.tap'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallTapWorker ended')
}
