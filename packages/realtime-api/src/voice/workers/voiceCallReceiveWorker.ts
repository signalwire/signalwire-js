import { CallingCall, getLogger, SagaIterator } from '@signalwire/core'
import { createCallObject } from '../Call'
import type { Call } from '../Call'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallReceiveWorker = function* (
  options: VoiceCallWorkerParams<CallingCall>
): SagaIterator {
  getLogger().trace('voiceCallReceiveWorker started')
  const {
    instance: client,
    payload,
    instanceMap: { get, set },
  } = options

  // Contexts is required
  const { contexts = [], topics = [] } = client?.options ?? {}
  if (!contexts.length && !topics.length) {
    throw new Error('Invalid contexts to receive inbound calls')
  }

  let callInstance = get<Call>(payload.call_id)
  if (!callInstance) {
    callInstance = createCallObject({
      store: client.store,
      payload: payload,
    })
  } else {
    callInstance.setPayload(payload)
  }

  set<Call>(payload.call_id, callInstance)
  // @ts-expect-error
  client.emit('call.received', callInstance)

  getLogger().trace('voiceCallReceiveWorker ended')
}
