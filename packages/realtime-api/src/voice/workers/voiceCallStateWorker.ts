import {
  getLogger,
  SagaIterator,
  CallingCallStateEventParams,
} from '@signalwire/core'
import { Call, createCallObject } from '../Call'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallStateWorker = function* (
  options: VoiceCallWorkerParams<CallingCallStateEventParams>
): SagaIterator {
  getLogger().trace('voiceCallStateWorker started')
  const {
    instance: client,
    payload,
    instanceMap: { get, set, remove },
  } = options

  let callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    callInstance = createCallObject({
      store: client.store,
      payload,
    })
  } else {
    callInstance.setPayload(payload)
  }
  set<Call>(payload.call_id, callInstance)

  switch (payload.call_state) {
    case 'ended': {
      callInstance.emit('call.state', callInstance)

      // Resolves the promise when user disconnects using a peer call instance
      // @ts-expect-error
      callInstance.emit('connect.disconnected', callInstance)
      remove<Call>(payload.call_id)
      break
    }
    default:
      callInstance.emit('call.state', callInstance)
      break
  }

  getLogger().trace('voiceCallStateWorker ended')
}
