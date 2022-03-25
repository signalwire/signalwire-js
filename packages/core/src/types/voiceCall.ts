import type { SwEvent } from '.'
import { MapToPubSubShape } from '..'
import { PRODUCT_PREFIX_VOICE_CALL } from '../utils/constants'
import type {
  CamelToSnakeCase,
  OnlyFunctionProperties,
  OnlyStateProperties,
} from './utils'

type ToInternalVoiceEvent<T extends string> = `${VoiceNamespace}.${T}`
export type VoiceNamespace = typeof PRODUCT_PREFIX_VOICE_CALL

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

type SipCodec = 'PCMU' | 'PCMA' | 'OPUS' | 'G729' | 'G722' | 'VP8' | 'H264'

export interface SipHeader {
  name: string
  value: string
}

export interface VoiceCallPhoneParams {
  type: 'phone'
  from?: string
  to: string
  timeout?: number
}

export interface VoiceCallSipParams {
  type: 'sip'
  from: string
  to: string
  timeout?: number
  headers?: SipHeader[]
  codecs?: SipCodec[]
  webrtc_media?: boolean
}

export interface NestedArray<T> extends Array<T | NestedArray<T>> {}

export type VoiceCallDeviceParams = VoiceCallPhoneParams | VoiceCallSipParams

export interface VoiceCallDialMethodParams {
  region?: string
  devices: NestedArray<VoiceCallDeviceParams>
}

export type VoiceCallDisconnectReason =
  | 'hangup'
  | 'cancel'
  | 'busy'
  | 'noAnswer'
  | 'decline'
  | 'error'

/**
 * Public Contract for a VoiceCall
 */
export interface VoiceCallContract {
  /** Unique id for this voice call */
  id: string

  dial(params?: VoiceCallDialMethodParams): this
  hangup(reason?: VoiceCallDisconnectReason): void
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

interface VoiceCallStateEvent {
  call_id: string
  node_id: string
  tag: string
}

/**
 * 'voice.call.created'
 */
export interface VoiceCallCreatedEventParams extends VoiceCallStateEvent {}

export interface VoiceCallCreatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCreated>
  params: VoiceCallCreatedEventParams
}

/**
 * 'voice.call.ended'
 */
export interface VoiceCallEndedEventParams extends VoiceCallStateEvent {}

export interface VoiceCallEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallEnded>
  params: VoiceCallEndedEventParams
}

export type VoiceCallEvent = VoiceCallCreatedEvent | VoiceCallEndedEvent

export type VoiceCallEventParams =
  | VoiceCallCreatedEventParams
  | VoiceCallEndedEventParams

export type VoiceCallAction = MapToPubSubShape<VoiceCallEvent>

export type VoiceCallJSONRPCMethod = 'calling.dial' | 'calling.end'
