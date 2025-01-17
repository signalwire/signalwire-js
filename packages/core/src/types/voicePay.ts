// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Public Event Types (not yet exposed publicly)
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

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

interface VoiceCallPayMethodPrompts {
  for:
    | 'payment-card-number'
    | 'expiration-date'
    | 'security-code'
    | 'postal-code'
    | 'payment-processing'
    | 'payment-completed'
    | 'payment-failed'
    | 'payment-canceled'
  cardType?: string
  errorType?:
    | 'timeout'
    | 'invalid-card-number'
    | 'invalid-card-type'
    | 'invalid-date'
    | 'invalid-security-code'
    | 'invalid-postal-code'
    | 'session-in-progress'
    | 'card-declined'
  actions: VoiceCallPayMethodPromptAction[]
}

export interface VoiceCallPayMethodParams {
  input?: 'dtmf' | 'voice'
  statusUrl?: string
  paymentMehod?: 'credit-card'
  timeout?: number
  maxAttempts?: number
  securityCode?: boolean
  postalCode?: boolean | number
  minPostalCodeLength?: number
  paymentConnectorUrl: string
  tokenType?: 'one-time' | 'reusable'
  chargeAmount?: number
  currency?: string
  language?: string
  voice?: string
  description?: string
  validCardTypes?: string
  paremeters?: VoiceCallPayMethodParameter[]
  prompts?: VoiceCallPayMethodPrompts[]
}

// ────────────────────────────────────────────────────────────
//  Voice CallPay Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────
