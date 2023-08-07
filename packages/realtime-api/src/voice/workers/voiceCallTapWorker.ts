import {
  getLogger,
  SagaIterator,
  CallingCallTapEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import { CallTap, createCallTapObject } from '../CallTap'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallTapWorker = function* (
  options: VoiceCallWorkerParams<CallingCallTapEventParams>
): SagaIterator {
  getLogger().trace('voiceCallTapWorker started')
  const {
    payload,
    instanceMap: { get, set, remove },
  } = options

  const callInstance = get(payload.call_id) as Call
  if (!callInstance) {
    throw new Error('Missing call instance for tap')
  }

  let tapInstance = get(payload.control_id) as CallTap
  if (!tapInstance) {
    tapInstance = createCallTapObject({
      store: callInstance.store,
      payload,
    })
  } else {
    tapInstance.setPayload(payload)
  }
  set(payload.control_id, tapInstance)

  switch (payload.state) {
    case 'tapping':
      callInstance.emit('tap.started', tapInstance)
      break
    case 'finished':
      callInstance.emit('tap.ended', tapInstance)

      // To resolve the ended() promise in CallTap
      tapInstance.emit('tap.ended', tapInstance)

      remove<CallTap>(payload.control_id)
      break
    default:
      getLogger().warn(`Unknown tap state: "${payload.state}"`)
      break
  }

  getLogger().trace('voiceCallTapWorker ended')
}
