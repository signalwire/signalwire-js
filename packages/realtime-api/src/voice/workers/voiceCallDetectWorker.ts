import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallDetectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallDetect, createCallDetectObject } from '../CallDetect'

let waitingForReady = false

export const voiceCallDetectWorker: SDKCallWorker<CallingCallDetectEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallDetectWorker started')
    const {
      payload,
      instanceMap: { get, set },
    } = options

    const callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for collect')
    }

    let detectInstance = get(payload.control_id) as CallDetect
    if (!detectInstance) {
      detectInstance = createCallDetectObject({
        store: callInstance.store,
        // @ts-expect-error
        emitter: callInstance.emitter,
        payload,
      })
    } else {
      detectInstance.setPayload(payload)
    }
    set(payload.control_id, detectInstance)

    const { detect } = payload
    if (!detect) return

    const {
      type,
      params: { event },
    } = detect

    switch (event) {
      case 'finished':
        callInstance.baseEmitter.emit('detect.ended', detectInstance)

        // To resolve the ended() promise in CallDetect
        detectInstance.baseEmitter.emit('detect.ended', detectInstance)
        break
      case 'error': {
        callInstance.baseEmitter.emit('detect.ended', payload)

        // To resolve the ended() promise in CallDetect
        detectInstance.baseEmitter.emit('detect.ended', payload)
        break
      }
      default:
        callInstance.baseEmitter.emit('detect.updated', detectInstance)
        break
    }

    switch (type) {
      case 'machine':
        if (waitingForReady && event === 'READY') {
          callInstance.baseEmitter.emit('detect.ended', detectInstance)

          // To resolve the ended() promise in CallDetect
          detectInstance.baseEmitter.emit('detect.ended', detectInstance)
        }
        if (callInstance._waitForCallDetectMachineBeep) {
          waitingForReady = true
        }
        break
      default:
        break
    }

    getLogger().trace('voiceCallDetectWorker ended')
  }
