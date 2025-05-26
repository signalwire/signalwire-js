import { MapToPubSubShape, SwEvent, ToInternalVoiceEvent } from '..'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallSendDigits = 'call.send_digits'

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

export type CallingCallSendDigitsState = 'finished'

export interface CallingCallSendDigitsEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallSendDigitsState
}

/**
 * 'calling.call.send_digits
 */
export interface CallingCallSendDigitsEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallSendDigits>
  params: CallingCallSendDigitsEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Voice Send Digits Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallSendDigitsMethod = 'calling.send_digits'

// ────────────────────────────────────────────────────────────
//  Voice CallSendDigits Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallSendDigitsEvent =
  // Server Events
  CallingCallSendDigitsEvent

export type VoiceCallSendDigitsEventParams =
  // Server Event Params
  CallingCallSendDigitsEventParams

export type VoiceCallSendDigitsAction =
  MapToPubSubShape<CallingCallSendDigitsEvent>
