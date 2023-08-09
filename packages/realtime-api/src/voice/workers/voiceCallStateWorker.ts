import {
  getLogger,
  SagaIterator,
  CallingCallStateEventParams,
} from '@signalwire/core'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'
import { Call } from '../Call2'

export const voiceCallStateWorker = function* (
  options: VoiceCallWorkerParams<CallingCallStateEventParams>
): SagaIterator {
  getLogger().trace('voiceCallStateWorker started')
  const {
    payload,
    instanceMap: { get, set, remove },
    initialState: { voice },
  } = options

  let callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    callInstance = new Call({
      voice,
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
