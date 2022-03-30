import { toSyntheticEvent } from '@signalwire/core'
export * from './voiceCallStateWorker'
export * from './voiceCallReceiveWorker'
export * from './voiceCallPlayWorker'
export * from './voiceCallRecordWorker'

export const SYNTHETIC_CALL_STATE_ANSWERED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

// export const SYNTHETIC_CALL_STATE_FAILED_EVENT = toSyntheticEvent(
//   'calling.call.failed'
// )

export const SYNTHETIC_CALL_STATE_ENDED_EVENT =
  toSyntheticEvent('calling.call.ended')
