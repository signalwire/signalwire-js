import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKActions,
  SDKWorker,
  VoiceCallDetectAction,
} from '@signalwire/core'
import type { Client } from '../../client/index'
import { CallDetectListeners } from '../../types'
import type { Call } from '../Call'
import { CallDetect } from '../CallDetect'

interface VoiceCallDetectWorkerInitialState {
  controlId: string
  listeners?: CallDetectListeners
}

export const voiceCallDetectWorker: SDKWorker<Client> = function* (
  options
): SagaIterator {
  getLogger().trace('voiceCallDetectWorker started')
  const {
    channels: { swEventChannel },
    instanceMap: { get, set, remove },
    initialState,
  } = options

  const { controlId, listeners } =
    initialState as VoiceCallDetectWorkerInitialState

  function* worker(action: VoiceCallDetectAction) {
    const { payload } = action

    if (payload.control_id !== controlId) return

    const callInstance = get<Call>(payload.call_id)
    if (!callInstance) {
      throw new Error('Missing call instance for collect')
    }

    let detectInstance = get<CallDetect>(payload.control_id)
    if (!detectInstance) {
      detectInstance = new CallDetect({
        call: callInstance,
        payload,
        listeners,
      })
    } else {
      detectInstance.setPayload(payload)
    }
    set<CallDetect>(payload.control_id, detectInstance)

    const { detect } = payload
    if (!detect) return

    const { type, params } = detect
    const { event } = params

    switch (event) {
      case 'finished':
      case 'error': {
        callInstance.emit('detect.ended', detectInstance)
        detectInstance.emit('detect.ended', detectInstance)

        remove<CallDetect>(payload.control_id)
        return true
      }
      default:
        callInstance.emit('detect.updated', detectInstance)
        detectInstance.emit('detect.updated', detectInstance)
        break
    }

    switch (type) {
      case 'machine':
        if (params.beep && detectInstance.waitForBeep) {
          callInstance.emit('detect.ended', detectInstance)
          detectInstance.emit('detect.ended', detectInstance)
        }
        break
      case 'digit':
      case 'fax':
        break
      default:
        getLogger().warn(`Unknown detect type: "${type}"`)
        break
    }

    return false
  }

  while (true) {
    const action = yield sagaEffects.take(
      swEventChannel,
      (action: SDKActions) => action.type === 'calling.call.detect'
    )

    const shouldStop = yield sagaEffects.fork(worker, action)

    if (shouldStop.result()) break
  }

  getLogger().trace('voiceCallDetectWorker ended')
}
