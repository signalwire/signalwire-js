import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallSDKEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { createCallCollectObject } from '../CallCollect'

export const voiceSDKCallCollectWorker: SDKCallWorker<CallingCallSDKEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceSDKCallCollectWorker started')
    const {
      payload,
      instanceMap: { get, set },
    } = options

    const callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for collect')
    }

    const collectInstance = createCallCollectObject({
      store: callInstance.store,
      // @ts-expect-error
      emitter: callInstance.emitter,
      payload,
    })

    set(payload.control_id, collectInstance)

    callInstance.baseEmitter.emit('collect.started', collectInstance)

    getLogger().trace('voiceSDKCallCollectWorker ended')
  }
