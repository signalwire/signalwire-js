import type {
  SwEvent,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlaybackContract,
  VoiceCallPlaybackEvent,
  VoiceCallPlaybackEventNames,
  VoicePlaylist,
  VoiceCallPlayMethod,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayTTSMethodParams,
  VoiceCallRecordingEventNames,
  VoiceCallRecordMethodParams,
  VoiceCallRecordingContract,
  VoiceCallRecordingEvent,
  VoiceCallRecordMethod,
  VoiceCallDetectMethod,
  VoiceCallPlaybackEventParams,
  VoiceCallRecordingEventParams,
  VoiceCallDetectEventParams,
  VoiceCallDetectEventNames,
  VoiceCallDetectMethodParams,
  VoiceCallDetectContract,
  VoiceCallDetectMachineParams,
  VoiceCallDetectFaxParams,
  VoiceCallDetectDigitParams,
  VoiceCallDetectEvent,
  VoiceCallTapEventNames,
  VoiceCallTapMethodParams,
  VoiceCallTapContract,
  VoiceCallTapAudioMethodParams,
  VoiceCallTapEvent,
  VoiceCallTapMethod,
  VoiceCallCollectEventNames,
  VoiceCallCollectMethodParams,
  VoiceCallCollectContract,
  VoiceCallCollectEvent,
  VoiceCallTapEventParams,
  VoiceCallCollectEventParams,
  VoiceCallCollectMethod,
  VoiceCallPromptEventNames,
  VoiceCallPromptMethodParams,
  VoiceCallPromptAudioMethodParams,
  VoiceCallPromptContract,
  VoiceCallPromptRingtoneMethodParams,
  VoiceCallPromptTTSMethodParams,
  VoiceCallPromptEvent,
  VoiceCallPromptEventParams,
  VoiceCallPromptMethod,
  VoiceCallSendDigitsEvent,
  VoiceCallSendDigitsEventParams,
  VoiceCallSendDigitsMethod,
  ToInternalVoiceEvent,
  VoiceCallConnectEventNames,
  VoiceCallConnectMethodParams,
  VoiceCallConnectPhoneMethodParams,
  VoiceCallConnectSipMethodParams,
  VoiceCallConnectEvent,
  VoiceCallConnectEventParams,
  VoiceCallConnectMethod,
  CallingCallConnectState,
  NestedArray,
} from '.'
import { MapToPubSubShape } from '..'
import type {
  CamelToSnakeCase,
  OnlyFunctionProperties,
  OnlyStateProperties,
} from './utils'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallDial = 'call.dial'
export type CallState = 'call.state'
export type CallReceive = 'call.receive'

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

export type CallCreated = 'call.created'
export type CallEnded = 'call.ended'
export type CallReceived = 'call.received'

export type VoiceCallEventNames =
  | CallCreated
  | CallEnded
  | VoiceCallPlaybackEventNames
  | VoiceCallRecordingEventNames
  | VoiceCallDetectEventNames
  | VoiceCallTapEventNames
  | VoiceCallCollectEventNames
  | VoiceCallPromptEventNames
  | VoiceCallConnectEventNames

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

type CallDeviceParamsShared = {
  timeout?: number
  max_duration?: number
  call_state_url?: string
  call_state_events?: string[]
}
export interface CallingCallPhoneDevice {
  type: 'phone'
  params: {
    from_number: string
    to_number: string
  } & CallDeviceParamsShared
}

export interface CallingCallSIPDevice {
  type: 'sip'
  params: {
    from: string
    from_name?: string
    to: string
    headers?: SipHeader[]
    codecs?: SipCodec[]
    webrtc_media?: boolean
  } & CallDeviceParamsShared
}

export type CallingCallDevice = CallingCallPhoneDevice | CallingCallSIPDevice

export type CallingCallDirection = 'inbound' | 'outbound'

export type CallingCallState =
  | 'created'
  | 'ringing'
  | 'answered'
  | 'ending'
  | 'ended'

export interface CallingCall {
  call_id: string
  call_state: CallingCallState
  context?: string
  tag?: string
  direction: CallingCallDirection
  device: CallingCallDevice
  node_id: string
  segment_id?: string
}

interface CallingCallDial extends CallingCall {
  dial_winner: 'true' | 'false'
}

/**
 * 'calling.call.dial'
 */
export type CallingCallDialDialingEventParams = {
  node_id: string
  tag: string
  dial_state: 'dialing'
}
export type CallingCallDialAnsweredEventParams = {
  node_id: string
  tag: string
  dial_state: 'answered'
  call: CallingCallDial
}
export type CallingCallDialFailedEventParams = {
  node_id: string
  tag: string
  dial_state: 'failed'
  reason: string
  source: CallingCallDirection
}
export type CallingCallDialEventParams =
  | CallingCallDialDialingEventParams
  | CallingCallDialAnsweredEventParams
  | CallingCallDialFailedEventParams

export interface CallingCallDialEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallDial>
  params: CallingCallDialEventParams
}

/**
 * 'calling.call.state'
 */
export interface CallingCallStateEventParams extends CallingCall {
  peer?: {
    call_id: string
    node_id: string
  }
}
export interface CallingCallStateEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallState>
  params: CallingCallStateEventParams
}

/**
 * 'calling.call.receive'
 */
export interface CallingCallReceiveEventParams extends CallingCall {}
export interface CallingCallReceiveEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallReceive>
  params: CallingCallReceiveEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.call.received'
 */
export interface VoiceCallReceivedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallReceived>
  params: CallingCallReceiveEventParams
}

// ────────────────────────────────────────────────────────────
//  Voice Call Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallMethod =
  | 'calling.dial'
  | 'calling.end'
  | 'calling.pass'
  | 'calling.answer'
  | VoiceCallPlayMethod
  | VoiceCallRecordMethod
  | VoiceCallDetectMethod
  | VoiceCallTapMethod
  | VoiceCallCollectMethod
  | VoiceCallPromptMethod
  | VoiceCallSendDigitsMethod
  | VoiceCallConnectMethod

export type SipCodec =
  | 'PCMU'
  | 'PCMA'
  | 'OPUS'
  | 'G729'
  | 'G722'
  | 'VP8'
  | 'H264'

export interface SipHeader {
  name: string
  value: string
}

interface VoiceCallParams {
  timeout?: number
  callStateUrl?: string
  callStateEvents?: CallingCallState[]
}

export interface VoiceCallPhoneParams extends VoiceCallParams {
  type: 'phone'
  from?: string
  to: string
}

export type OmitType<T> = Omit<T, 'type'>

export interface VoiceCallSipParams extends VoiceCallParams {
  type: 'sip'
  from: string
  to: string
  headers?: SipHeader[]
  codecs?: SipCodec[]
  webrtcMedia?: boolean
  sessionTimeout?: number
}

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

export interface VoiceCallDialRegionParams {
  region?: VoiceRegion
  maxPricePerMinute?: number
  nodeId?: string
}

export type VoiceCallDialPhoneMethodParams = OmitType<VoiceCallPhoneParams> &
  VoiceCallDialRegionParams
export type VoiceCallDialSipMethodParams = OmitType<VoiceCallSipParams> &
  VoiceCallDialRegionParams

type VoiceRegion = string

export type VoiceDialerParams = {
  devices: VoiceDeviceBuilder
} & VoiceCallDialRegionParams

export interface VoiceDeviceBuilder {
  devices: VoiceCallDialMethodParams['devices']
  add(params: VoiceCallDeviceParams | VoiceCallDeviceParams[]): this
}

export type CallingCallWaitForState = Extract<
  CallingCallState,
  'ending' | 'ended'
>

// ────────────────────────────────────────────────────────────
//  Voice Call Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallContract<T = any> {
  /** Unique id for this voice call */
  readonly id: string
  /** @ignore */
  tag: string
  /** @ignore */
  callId: string
  /** @ignore */
  nodeId: string
  /** @ignore */
  state: CallingCallState
  /** @ignore */
  context?: string

  connectState: CallingCallConnectState
  type: 'phone' | 'sip'
  device: any // FIXME:
  from: string
  to: string
  direction: CallingCallDirection
  headers?: SipHeader[]
  active: boolean
  connected: boolean
  peer: T | undefined

  dial(params: VoiceDialerParams): Promise<T>
  hangup(reason?: VoiceCallDisconnectReason): Promise<void>
  pass(): Promise<void>
  answer(): Promise<T>
  play(params: VoicePlaylist): Promise<VoiceCallPlaybackContract>
  playAudio(
    params: VoiceCallPlayAudioMethodParams
  ): Promise<VoiceCallPlaybackContract>
  playSilence(
    params: VoiceCallPlaySilenceMethodParams
  ): Promise<VoiceCallPlaybackContract>
  playRingtone(
    params: VoiceCallPlayRingtoneMethodParams
  ): Promise<VoiceCallPlaybackContract>
  playTTS(
    params: VoiceCallPlayTTSMethodParams
  ): Promise<VoiceCallPlaybackContract>
  record(
    params: VoiceCallRecordMethodParams
  ): Promise<VoiceCallRecordingContract>
  recordAudio(
    params?: VoiceCallRecordMethodParams['audio']
  ): Promise<VoiceCallRecordingContract>
  prompt(params: VoiceCallPromptMethodParams): Promise<VoiceCallPromptContract>
  promptAudio(
    params: VoiceCallPromptAudioMethodParams
  ): Promise<VoiceCallPromptContract>
  promptRingtone(
    params: VoiceCallPromptRingtoneMethodParams
  ): Promise<VoiceCallPromptContract>
  promptTTS(
    params: VoiceCallPromptTTSMethodParams
  ): Promise<VoiceCallPromptContract>
  // TODO: add derived prompt methods
  sendDigits(digits: string): Promise<T>
  tap(params: VoiceCallTapMethodParams): Promise<VoiceCallTapContract>
  tapAudio(params: VoiceCallTapAudioMethodParams): Promise<VoiceCallTapContract>
  connect(params: VoiceCallConnectMethodParams): Promise<T>
  connectPhone(
    params: VoiceCallConnectPhoneMethodParams
  ): Promise<VoiceCallContract>
  connectSip(
    params: VoiceCallConnectSipMethodParams
  ): Promise<VoiceCallContract>
  /**
   * @deprecated use {@link disconnected} instead.
   */
  waitForDisconnected(): Promise<this>
  /**
   * Returns a promise that is resolved only after the current call has been
   * disconnected. Also see {@link connect}.
   *
   * @example
   *
   * ```js
   * const plan = new Voice.DeviceBuilder().add(
   *   Voice.DeviceBuilder.Sip({
   *     from: 'sip:user1@domain.com',
   *     to: 'sip:user2@domain.com',
   *     timeout: 30,
   *   })
   * )
   *
   * const peer = await call.connect(plan)
   * await call.disconnected()
   * ```
   */
  disconnected(): Promise<this>
  waitFor(
    params: CallingCallWaitForState | CallingCallWaitForState[]
  ): Promise<boolean>
  disconnect(): Promise<void>
  detect(params: VoiceCallDetectMethodParams): Promise<VoiceCallDetectContract>
  amd(
    params?: Omit<VoiceCallDetectMachineParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  // amd alias
  detectAnsweringMachine(
    params?: Omit<VoiceCallDetectMachineParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  detectFax(
    params?: Omit<VoiceCallDetectFaxParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  detectDigit(
    params?: Omit<VoiceCallDetectDigitParams, 'type'>
  ): Promise<VoiceCallDetectContract>
  collect(
    params: VoiceCallCollectMethodParams
  ): Promise<VoiceCallCollectContract>
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

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallEvent =
  | VoiceCallPlaybackEvent
  | VoiceCallRecordingEvent
  | VoiceCallDetectEvent
  | VoiceCallTapEvent
  | VoiceCallCollectEvent
  | VoiceCallPromptEvent
  | VoiceCallSendDigitsEvent
  | VoiceCallConnectEvent
  // Server Events
  | CallingCallDialEvent
  | CallingCallStateEvent
  | CallingCallReceiveEvent
  // SDK Events
  | VoiceCallReceivedEvent

export type VoiceCallEventParams =
  | VoiceCallPlaybackEventParams
  | VoiceCallRecordingEventParams
  | VoiceCallDetectEventParams
  | VoiceCallTapEventParams
  | VoiceCallCollectEventParams
  | VoiceCallPromptEventParams
  | VoiceCallSendDigitsEventParams
  | VoiceCallConnectEventParams
  // Server Event Params
  | CallingCallDialEventParams
  | CallingCallStateEventParams
  | CallingCallReceiveEventParams
  // SDK Event Params
  | VoiceCallReceivedEvent['params']

export type VoiceCallAction = MapToPubSubShape<VoiceCallEvent>

export type VoiceCallReceiveAction = MapToPubSubShape<CallingCallReceiveEvent>

export type VoiceCallStateAction = MapToPubSubShape<CallingCallStateEvent>

export type VoiceCallDialAction = MapToPubSubShape<CallingCallDialEvent>
