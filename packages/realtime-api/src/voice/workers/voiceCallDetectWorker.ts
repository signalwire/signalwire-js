import {
  getLogger,
  SagaIterator,
  CallingCallDetectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallDetect, createCallDetectObject } from '../CallDetect'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallDetectWorker = function* (
  options: VoiceCallWorkerParams<CallingCallDetectEventParams>
): SagaIterator {
  getLogger().trace('voiceCallDetectWorker started')
  const {
    payload,
    instanceMap: { get, set },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for collect')
  }

  let detectInstance = get<CallDetect>(payload.control_id)
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
  set<CallDetect>(payload.control_id, detectInstance)

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
      callInstance.baseEmitter.emit('detect.ended', detectInstance)

      // To resolve the ended() promise in CallDetect
      detectInstance.baseEmitter.emit('detect.ended', detectInstance)
      break
    }
    default:
      callInstance.baseEmitter.emit('detect.updated', detectInstance)
      break
  }

  switch (type) {
    case 'machine':
      if (detectInstance.waitingForReady && event === 'READY') {
        callInstance.baseEmitter.emit('detect.ended', detectInstance)

        // To resolve the ended() promise in CallDetect
        detectInstance.baseEmitter.emit('detect.ended', detectInstance)
      }
      if (detectInstance.waitForBeep) {
        detectInstance.waitingForReady = true
      }
      break
    default:
      getLogger().warn(`Unknown detect type: "${type}"`)
      break
  }

  getLogger().trace('voiceCallDetectWorker ended')
}
