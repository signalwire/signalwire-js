import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallCollectEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallCollect, createCallCollectObject } from '../CallCollect'

export const voiceCallCollectWorker: SDKCallWorker<CallingCallCollectEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallCollectWorker started')
    const {
      payload,
      instanceMap: { get, set },
    } = options

    const callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      throw new Error('Missing call instance for collect')
    }

    let collectInstance = get(payload.control_id) as CallCollect
    if (!collectInstance) {
      collectInstance = createCallCollectObject({
        store: callInstance.store,
        // @ts-expect-error
        emitter: callInstance.emitter,
        payload,
      })
    } else {
      collectInstance.setPayload(payload)
    }
    set(payload.control_id, collectInstance)

    /**
     * Only when partial_results: true
     */
    if (payload.final === false) {
      callInstance.baseEmitter.emit('collect.updated', collectInstance)
    } else {
      if (payload.result) {
        switch (payload.result.type) {
          case 'start_of_input': {
            callInstance.baseEmitter.emit(
              'collect.startOfInput',
              collectInstance
            )
            break
          }
          case 'no_match':
          case 'no_input':
          case 'error': {
            callInstance.baseEmitter.emit('collect.failed', collectInstance)

            // To resolve the ended() promise in CallCollect
            collectInstance.baseEmitter.emit('collect.failed', collectInstance)
            break
          }
          case 'speech':
          case 'digit': {
            callInstance.baseEmitter.emit('collect.ended', collectInstance)

            // To resolve the ended() promise in CallCollect
            collectInstance.baseEmitter.emit('collect.ended', collectInstance)
            break
          }
          default:
            getLogger().info(
              // @ts-expect-error
              `Unknown collect result type: "${payload.result.type}"`
            )
            break
        }
      }
    }

    getLogger().trace('voiceCallCollectWorker ended')
  }
