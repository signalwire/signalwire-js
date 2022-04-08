import { toSyntheticEvent } from '@signalwire/core'
export * from './voiceCallStateWorker'
export * from './voiceCallReceiveWorker'
export * from './voiceCallPlayWorker'
export * from './voiceCallRecordWorker'
export * from './voiceCallPromptWorker'
export * from './voiceCallTapWorker'
export * from './voiceCallConnectWorker'
export * from './voiceCallDialWorker'

export const SYNTHETIC_CALL_STATE_ANSWERED_EVENT = toSyntheticEvent(
  'calling.call.answered'
)

// export const SYNTHETIC_CALL_STATE_FAILED_EVENT = toSyntheticEvent(
//   'calling.call.failed'
// )

export const SYNTHETIC_CALL_STATE_ENDED_EVENT =
  toSyntheticEvent('calling.call.ended')

export const SYNTHETIC_CALL_DIAL_ANSWERED_EVENT = toSyntheticEvent(
  'calling.call.dial.answered'
)

export const SYNTHETIC_CALL_DIAL_FAILED_EVENT = toSyntheticEvent(
  'calling.call.dial.failed'
)
