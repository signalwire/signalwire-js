import {
  getLogger,
  SagaIterator,
  CallingCallDialEventParams,
} from '@signalwire/core'
import type { Call } from '../Call'
import type { VoiceCallWorkerParams } from './voiceCallingWorker'

export const voiceCallDialWorker = function* (
  options: VoiceCallWorkerParams<CallingCallDialEventParams>
): SagaIterator {
  getLogger().trace('voiceCallDialWorker started')
  const {
    payload,
    instanceMap: { get },
    initialState: { tag, voice },
  } = options

  // Inbound calls do not have the tag
  if (payload.tag && payload.tag !== tag) return

  switch (payload.dial_state) {
    case 'failed': {
      // @ts-expect-error
      voice.emit('dial.failed', payload)
      break
    }
    case 'answered': {
      const callInstance = get<Call>(payload.call.call_id)
      callInstance.setPayload(payload.call)
      // @ts-expect-error
      voice.emit('dial.answered', callInstance)
      break
    }
    default:
      break
  }

  getLogger().trace('voiceCallDialWorker ended')
}
