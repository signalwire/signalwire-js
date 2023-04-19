import {
  getLogger,
  SagaIterator,
  SDKChildWorker,
  CallingCallSDKDetectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallDetect, createCallDetectObject } from '../CallDetect'

export const voiceSDKCallDetectWorker: SDKChildWorker<CallingCallSDKDetectEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceSDKCallDetectWorker started')
    const {
      action: { payload },
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
