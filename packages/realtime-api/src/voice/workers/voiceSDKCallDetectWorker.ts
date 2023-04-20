import {
  getLogger,
  SagaIterator,
  CallingCallSDKDetectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallDetect, createCallDetectObject } from '../CallDetect'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceSDKCallDetectWorker = function* (
  options: VoiceCallWorkerParams<CallingCallSDKDetectEventParams>
): SagaIterator {
  getLogger().trace('voiceSDKCallDetectWorker started')
  const {
    payload,
    instanceMap: { get, set },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for detect')
  }

  const detectInstance = createCallDetectObject({
    store: callInstance.store,
    // @ts-expect-error
    emitter: callInstance.emitter,
    payload,
  })

  set<CallDetect>(payload.control_id, detectInstance)

  callInstance.baseEmitter.emit('detect.started', detectInstance)

  getLogger().trace('voiceSDKCallDetectWorker ended')
}
