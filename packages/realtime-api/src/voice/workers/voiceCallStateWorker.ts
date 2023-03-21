import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallStateEventParams,
} from '@signalwire/core'
import { Call, createCallObject } from '../Call'

export const voiceCallStateWorker: SDKCallWorker<CallingCallStateEventParams> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallStateWorker started')

    const {
      client,
      payload,
      instanceMap: { get, set, remove },
      initialState,
    } = options

    // Inbound calls do not have the tag
    if (payload.tag && payload.tag !== initialState.tag) return

    switch (payload.call_state) {
      case 'created':
      case 'ringing':
      case 'answered': {
        let callInstance = get(payload.call_id) as Call
        if (!callInstance) {
          callInstance = createCallObject({
            store: client.store,
            emitter: client.emitter,
            payload,
          })
        } else {
          callInstance.setPayload(payload)
        }
        set(payload.call_id, callInstance)
        callInstance.baseEmitter.emit('call.state', callInstance)
        break
      }
      case 'ended': {
        remove(payload.call_id)
        break
      }
      default:
        break
    }

    getLogger().trace('voiceCallStateWorker ended')
  }
