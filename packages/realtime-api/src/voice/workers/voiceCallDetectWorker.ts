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
    instanceMap: { get, set, remove },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for collect')
  }

  let detectInstance = get<CallDetect>(payload.control_id)
  if (!detectInstance) {
    detectInstance = createCallDetectObject({
      store: callInstance.store,
      payload,
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
      // @ts-expect-error
      callInstance.emit('detect.ended', detectInstance)

      // To resolve the ended() promise in CallDetect
      detectInstance.emit('detect.ended', detectInstance)

      remove<CallDetect>(payload.control_id)
      return
    }
    default:
      // @ts-expect-error
      callInstance.emit('detect.updated', detectInstance)
      break
  }

  switch (type) {
    case 'machine':
      if (params.beep && detectInstance.waitForBeep) {
        // @ts-expect-error
        callInstance.emit('detect.ended', detectInstance)

        // To resolve the ended() promise in CallDetect
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

  getLogger().trace('voiceCallDetectWorker ended')
}
