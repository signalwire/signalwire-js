import {
  getLogger,
  SagaIterator,
  CallingCallSDKEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallCollect, createCallCollectObject } from '../CallCollect'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceSDKCallCollectWorker = function* (
  options: VoiceCallWorkerParams<CallingCallSDKEventParams>
): SagaIterator {
  getLogger().trace('voiceSDKCallCollectWorker started')
  const {
    payload,
    instanceMap: { get, set },
  } = options

  const callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    throw new Error('Missing call instance for collect')
  }

  const collectInstance = createCallCollectObject({
    store: callInstance.store,
    // @ts-expect-error
    emitter: callInstance.emitter,
    payload,
  })

  set<CallCollect>(payload.control_id, collectInstance)

  callInstance.baseEmitter.emit('collect.started', collectInstance)

  getLogger().trace('voiceSDKCallCollectWorker ended')
}
