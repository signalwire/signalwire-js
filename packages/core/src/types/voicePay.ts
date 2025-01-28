// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

import { MapToPubSubShape } from 'packages/core/dist/core/src'
import {
  OnlyFunctionProperties,
  OnlyStateProperties,
  SwEvent,
  ToInternalVoiceEvent,
} from '..'

export type CallPay = 'call.pay'

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

export type CallPayStarted = 'pay.started'
export type CallPayUpdated = 'pay.updated'
export type CallPayEnded = 'pay.ended'
export type CallPayFailed = 'pay.failed'

export type VoiceCallPayEventNames =
  | CallPayStarted
  | CallPayUpdated
  | CallPayEnded
  | CallPayFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

type CardType =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'maestro'
  | 'discover'
  | 'optima'
  | 'jcb'
  | 'diners-club'
  | 'enroute'

type PaymentMethod = 'credit-card'

type PaymentToken = 'one-time' | 'reusable'

type For =
  | 'payment-card-number'
  | 'expiration-date'
  | 'security-code'
  | 'postal-code'
  | 'payment-processing'
  | 'payment-completed'
  | 'payment-failed'
  | 'payment-canceled'

type ErrorType =
  | 'timeout'
  | 'invalid-card-number'
  | 'invalid-card-type'
  | 'invalid-date'
  | 'invalid-security-code'
  | 'invalid-postal-code'
  | 'input-matching-failed'
  | 'session-in-progress'
  | 'card-declined'

type Result =
  | 'success'
  | 'too-many-failed-attempts'
  | 'payment-connector-error'
  | 'caller-interrupted-with-star'
  | 'relay-pay-stop'
  | 'caller-hung-up'
  | 'validation-error'
  | 'internal-error'

interface CallingCallPayEventCommonParams {
  node_id: string
  call_id: string
  control_id: string
  payment_method: PaymentMethod
  payment_card_number: string
  payment_card_type: CardType
  payment_card_postal_code: string
}

interface CallingCallPayEventStatusUpdateParams
  extends CallingCallPayEventCommonParams {
  for: For
  error_type: ErrorType
  attempt: number
  security_code: string
  expiration_date: string
}

interface CallingCallPayEventResultParams
  extends CallingCallPayEventCommonParams {
  result?: Result
  payment_token: PaymentToken
  payment_confirmation_code: string
  payment_card_security_code: string
  payment_card_expiration_date: string
  payment_error: ErrorType
  payment_error_code: string
  connector_error?: {
    code: string
    message: string
  }
}

export type CallingCallPayEventParams =
  | CallingCallPayEventStatusUpdateParams
  | CallingCallPayEventResultParams

/**
 * 'calling.call.pay'
 */
export interface CallingCallPayEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPay>
  params: CallingCallPayEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.pay.started'
 */
export interface VoiceCallPayStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPayStarted>
  params: CallingCallPayEventParams & { tag: string }
}
/**
 * 'calling.pay.updated'
 */
export interface VoiceCallPayUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPayUpdated>
  params: CallingCallPayEventParams & { tag: string }
}
/**
 * 'calling.pay.failed'
 */
export interface VoiceCallPayFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPayFailed>
  params: CallingCallPayEventParams & { tag: string }
}
/**
 * 'calling.pay.ended'
 */
export interface VoiceCallPayEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPayEnded>
  params: CallingCallPayEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Pay Methods & Param Interfaces
// ────────────────────────────────────────────────────────────
export type VoiceCallPayMethod = 'calling.pay' | 'calling.pay.stop'

interface VoiceCallPayMethodParameter {
  name: any
  value: any
}

interface VoiceCallPayMethodPromptAction {
  type: 'Say' | 'Play'
  phrase: string
}

interface VoiceCallPayMethodPrompt {
  for: For
  cardType?: CardType
  errorType?: ErrorType
  actions: VoiceCallPayMethodPromptAction[]
}

export interface VoiceCallPayMethodParams {
  input?: 'dtmf' | 'voice'
  statusUrl?: string
  paymentMehod?: PaymentMethod
  bankAccountType?: string
  timeout?: number
  maxAttempts?: number
  securityCode?: boolean
  postalCode?: boolean | number
  minPostalCodeLength?: number
  paymentConnectorUrl: string
  tokenType?: PaymentToken
  chargeAmount?: number
  currency?: string
  language?: string
  voice?: string
  description?: string
  validCardTypes?: CardType
  paremeters?: VoiceCallPayMethodParameter[]
  prompts?: VoiceCallPayMethodPrompt[]
}

// ────────────────────────────────────────────────────────────
//  Voice CallPay Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallPayContract {
  /** Unique id for this detection */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly nodeId: string
  /** @ignore */
  readonly controlId: string
  stop(): Promise<this>
}

/**
 * VoiceCallPay properties
 */
export type VoiceCallPayEntity = OnlyStateProperties<VoiceCallPayContract>

/**
 * VoiceCallPay methods
 */
export type VoiceCallPayMethods = OnlyFunctionProperties<VoiceCallPayContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallPayEvent =
  // Server Events
  | CallingCallPayEvent
  // SDK Events
  | VoiceCallPayStartedEvent
  | VoiceCallPayUpdatedEvent
  | VoiceCallPayFailedEvent
  | VoiceCallPayEndedEvent

export type VoiceCallPayEventParams =
  // Server Event Params
  | CallingCallPayEventParams
  // SDK Event Params
  | VoiceCallPayStartedEvent['params']
  | VoiceCallPayUpdatedEvent['params']
  | VoiceCallPayFailedEvent['params']
  | VoiceCallPayEndedEvent['params']

export type VoiceCallPayEventAction = MapToPubSubShape<VoiceCallPayEvent>
