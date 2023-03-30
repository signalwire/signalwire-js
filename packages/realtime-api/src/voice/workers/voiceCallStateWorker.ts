import {
  getLogger,
  SagaIterator,
  SDKCallWorker,
  CallingCallStateEventParams,
} from '@signalwire/core'
import { Call, createCallObject } from '../Call'
import type { Client } from '../../client/index'

export const voiceCallStateWorker: SDKCallWorker<
  CallingCallStateEventParams,
  Client
> = function* (options): SagaIterator {
  getLogger().trace('voiceCallStateWorker started')
  const {
    client,
    payload,
    instanceMap: { get, set, remove },
  } = options

  let callInstance = get(payload.call_id) as Call
  if (!callInstance) {
    callInstance = createCallObject({
      store: client.store,
      // @ts-expect-error
      emitter: client.emitter,
      payload,
    })
  } else {
    callInstance.setPayload(payload)
  }
  set(payload.call_id, callInstance)

  switch (payload.call_state) {
    case 'ended': {
      callInstance.baseEmitter.emit('call.state', callInstance)

      // Resolves the promise when user disconnects using a peer call instance
      callInstance.baseEmitter.emit('connect.disconnected', callInstance)
      remove(payload.call_id)
      break
    }
    default:
      callInstance.baseEmitter.emit('call.state', callInstance)
      break
  }

  getLogger().trace('voiceCallStateWorker ended')
}
