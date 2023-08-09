import { CallingCall, getLogger, SagaIterator } from '@signalwire/core'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'
import { Call } from '../Call2'
import { prefixEvent } from '../../utils/internals'

export const voiceCallReceiveWorker = function* (
  options: VoiceCallWorkerParams<CallingCall>
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const {
    payload,
    instanceMap: { get, set },
    initialState: { voice },
  } = options

  // Contexts is required
  if (!payload.context || !payload.context.length) {
    throw new Error('Invalid context to receive inbound call')
  }

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
  // @ts-expect-error
  voice.emit(prefixEvent(payload.context, 'call.received'), callInstance)

  getLogger().trace('voiceCallReceiveWorker ended')
}
