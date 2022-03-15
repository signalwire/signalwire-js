import type { SwEvent } from '.'
import { PRODUCT_PREFIX_VOICE } from '../utils/constants'
import type {
  CamelToSnakeCase,
  OnlyFunctionProperties,
  OnlyStateProperties,
} from './utils'

type ToInternalVoiceEvent<T extends string> = `${VoiceNamespace}.${T}`
export type VoiceNamespace = typeof PRODUCT_PREFIX_VOICE

/**
 * Public event types
 */
export type CallCreated = 'call.created'
export type CallEnded = 'call.ended'

/**
 * List of public event names
 */
export type VoiceCallEventNames = CallCreated | CallEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVoiceCallEventNames =
  ToInternalVoiceEvent<VoiceCallEventNames>

/**
 * Public Contract for a VoiceCall
 */
export interface VoiceCallContract {
  /** Unique id for this voice call */
  id: string

  dial(params?: any): any
  hangup(params?: any): any
}

/**
 * VoiceCall properties
 */
export type VoiceCallEntity = OnlyStateProperties<VoiceCallContract>
/**
 * VoiceCall methods
 */
export type VoiceCallMethods = OnlyFunctionProperties<VoiceCallContract>

/**
 * VoiceCallEntity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVoiceCallEntity = {
  [K in NonNullable<
    keyof VoiceCallEntity
  > as CamelToSnakeCase<K>]: VoiceCallEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'voice.call.created'
 */
export interface VoiceCallCreatedEventParams {
  call_id: string
}

export interface VoiceCallCreatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCreated>
  params: VoiceCallCreatedEventParams
}

/**
 * 'voice.call.ended'
 */
export interface VoiceCallEndedEventParams {
  call_id: string
}

export interface VoiceCallEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallEnded>
  params: VoiceCallEndedEventParams
}

export type VoiceCallEvent = VoiceCallCreatedEvent | VoiceCallEndedEvent

export type VoiceCallEventParams =
  | VoiceCallCreatedEventParams
  | VoiceCallEndedEventParams
