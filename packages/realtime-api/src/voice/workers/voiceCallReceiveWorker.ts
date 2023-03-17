import {
  CallingCall,
  getLogger,
  SagaIterator,
  SDKCallWorker,
} from '@signalwire/core'
import { createCallObject } from '../Call'
import type { Call } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallReceiveWorker: SDKCallWorker<CallingCall, Client> =
  function* (options): SagaIterator {
    getLogger().trace('voiceCallReceiveWorker started')

    const {
      client,
      payload,
      instanceMap: { get, set },
    } = options

    // Contexts is required
    const { contexts = [] } = client?.options ?? {}
    if (!contexts.length) {
      throw new Error('Invalid contexts to receive inbound calls')
    }

    // REVIEW: At the time of call receive, should CallInstance be exist in the instanceMap?
    let callInstance = get(payload.call_id) as Call
    if (!callInstance) {
      callInstance = createCallObject({
        store: client.store,
        // @ts-expect-error
        emitter: client.emitter,
        payload: payload,
      })
    } else {
      callInstance.setPayload(payload)
    }

    set(payload.call_id, callInstance)
    client.baseEmitter.emit('call.received', callInstance)

    getLogger().trace('voiceCallReceiveWorker ended')
  }
