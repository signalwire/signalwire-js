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
    } = options

    // TODO: Why are we getting an undefined payload?
    if (!payload) return

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
        // FIXME: Client is not getting the call.state event on the outbound call.
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
