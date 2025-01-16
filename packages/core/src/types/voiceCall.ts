import type {
  SwEvent,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlayAudioParams,
  VoiceCallPlaybackContract,
  VoiceCallPlaybackEvent,
  VoiceCallPlaybackEventNames,
  VoicePlaylist,
  VoiceCallPlayMethod,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlayRingtoneParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayTTSMethodParams,
  VoiceCallPlayTTSParams,
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
} from '.'
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
 * Private event types
 */
export type CallDial = 'call.dial'
export type CallState = 'call.state'
export type CallReceive = 'call.receive'
export type CallCollect = 'call.collect'
export type CallConnect = 'call.connect'
export type CallSendDigits = 'call.send_digits'

/**
 * Public event types
 */
export type CallCreated = 'call.created'
export type CallEnded = 'call.ended'
export type CallReceived = 'call.received'
export type CallPromptStarted = 'prompt.started'
export type CallPromptStartOfInput = 'prompt.startOfInput'
export type CallPromptUpdated = 'prompt.updated'
export type CallPromptEnded = 'prompt.ended'
export type CallPromptFailed = 'prompt.failed'
export type CallCollectStarted = 'collect.started'
export type CallCollectStartOfInput = 'collect.startOfInput'
export type CallCollectUpdated = 'collect.updated'
export type CallCollectEnded = 'collect.ended'
export type CallCollectFailed = 'collect.failed'
// Not exposed yet to the public-side
export type CallConnectConnecting = 'connect.connecting'
export type CallConnectConnected = 'connect.connected'
export type CallConnectDisconnected = 'connect.disconnected'
export type CallConnectFailed = 'connect.failed'

/**
 * List of public event names
 */
export type VoiceCallEventNames =
  | CallCreated
  | CallEnded
  | VoiceCallPlaybackEventNames
  | VoiceCallRecordingEventNames
  | VoiceCallDetectEventNames
  | VoiceCallTapEventNames
  | CallPromptStarted
  | CallPromptUpdated
  | CallPromptEnded
  | CallPromptFailed
  | CallConnectConnecting
  | CallConnectConnected
  | CallConnectDisconnected
  | CallConnectFailed
  | CallCollectStarted
  | CallCollectUpdated
  | CallCollectEnded
  | CallCollectFailed

/**
 * List of internal events
 * @internal
 */
// export type InternalVoiceCallEventNames =
//   ToInternalVoiceEvent<VoiceCallEventNames>

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

export interface NestedArray<T> extends Array<T | NestedArray<T>> {}

export type VoiceCallDeviceParams = VoiceCallPhoneParams | VoiceCallSipParams

export interface VoiceCallDialMethodParams {
  region?: string
  devices: NestedArray<VoiceCallDeviceParams>
}

export type CollectDigitsConfig = {
  /** Max number of digits to collect. */
  max: number
  /** Timeout in seconds between each digit. */
  digitTimeout?: number
  /** DTMF digits that will end the collection. Default not set. */
  terminators?: string
}

export type CollectSpeechConfig = {
  /** How much silence to wait for end of speech. Default to 1 second. */
  endSilenceTimeout?: number
  /** Maximum time to collect speech. Default to 60 seconds. */
  speechTimeout?: number
  /** Language to detect. Default to `en-US`. */
  language?: string
  /** Array of expected phrases to detect. */
  hints?: string[]
  /** Model use for enhance speech recognition */
  model?: 'default' | 'enhanced' | 'enhanced.phone_call' | 'enhanced.video'
}

export type SpeechOrDigits =
  | {
      digits: CollectDigitsConfig
      speech?: never
    }
  | {
      digits?: never
      speech: CollectSpeechConfig
    }
export type VoiceCallPromptMethodParams = SpeechOrDigits & {
  playlist: VoicePlaylist
  initialTimeout?: number
}
export type VoiceCallPromptAudioMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayAudioParams> & {
    volume?: number
    initialTimeout?: number
  }
export type VoiceCallPromptRingtoneMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayRingtoneParams> & {
    volume?: number
    initialTimeout?: number
  }
export type VoiceCallPromptTTSMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayTTSParams> & {
    volume?: number
    initialTimeout?: number
  }

export type VoiceCallCollectMethodParams = SpeechOrDigits & {
  initialTimeout?: number
  partialResults?: boolean
  continuous?: boolean
  sendStartOfInput?: boolean
  startInputTimers?: boolean
}

export interface VoiceCallConnectAdditionalParams {
  ringback?: VoicePlaylist
  maxPricePerMinute?: number
}

export type VoiceCallConnectMethodParams =
  | VoiceDeviceBuilder
  | ({
      devices: VoiceDeviceBuilder
    } & VoiceCallConnectAdditionalParams)

export type VoiceCallConnectPhoneMethodParams = OmitType<VoiceCallPhoneParams> &
  VoiceCallConnectAdditionalParams
export type VoiceCallConnectSipMethodParams = OmitType<VoiceCallSipParams> &
  VoiceCallConnectAdditionalParams

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

/**
 * Public Contract for a VoiceCallPrompt
 */
export interface VoiceCallPromptContract {
  /** Unique id for this prompt */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string

  readonly type?: CallingCallCollectResult['type']
  /** Alias for type in case of errors */
  readonly reason: string | undefined
  readonly digits: string | undefined
  readonly speech: string | undefined
  readonly terminator: string | undefined
  readonly text: string | undefined
  readonly confidence: number | undefined

  stop(): Promise<this>
  setVolume(volume: number): Promise<this>
  /**
   * @deprecated use {@link ended} instead.
   */
  waitForResult(): Promise<VoiceCallPromptContract>
  ended(): Promise<this>
}

/**
 * VoiceCallPrompt properties
 */
export type VoiceCallPromptEntity = OnlyStateProperties<VoiceCallPromptContract>

/**
 * VoiceCallPrompt methods
 */
export type VoiceCallPromptMethods =
  OnlyFunctionProperties<VoiceCallPromptContract>

/**
 * Public Contract for a VoiceCallCollect
 */
export interface VoiceCallCollectContract {
  /** Unique id for this collect */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string

  readonly type?: CallingCallCollectResult['type']
  /** Alias for type in case of errors */
  readonly reason: string | undefined
  readonly digits: string | undefined
  readonly speech: string | undefined
  readonly terminator: string | undefined
  readonly text: string | undefined
  readonly confidence: number | undefined

  stop(): Promise<this>
  startInputTimers(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallCollect properties
 */
export type VoiceCallCollectEntity =
  OnlyStateProperties<VoiceCallCollectContract>

/**
 * VoiceCallCollect methods
 */
export type VoiceCallCollectMethods =
  OnlyFunctionProperties<VoiceCallCollectContract>

export type CallingCallWaitForState = Extract<
  CallingCallState,
  'ending' | 'ended'
>

/**
 * Public Contract for a VoiceCall
 */
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

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

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

type CallingCallDevice = CallingCallPhoneDevice | CallingCallSIPDevice
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

/**
 * 'calling.call.collect'
 */
interface CallingCallCollectResultError {
  type: 'error'
}
interface CallingCallCollectResultNoInput {
  type: 'no_input'
}
interface CallingCallCollectResultNoMatch {
  type: 'no_match'
}
interface CallingCallCollectResultStartOfInput {
  type: 'start_of_input'
}
interface CallingCallCollectResultDigit {
  type: 'digit'
  params: {
    digits: string
    terminator: string
  }
}
interface CallingCallCollectResultSpeech {
  type: 'speech'
  params: {
    text: string
    confidence: number
  }
}
export type CallingCallCollectResult =
  | CallingCallCollectResultError
  | CallingCallCollectResultNoInput
  | CallingCallCollectResultNoMatch
  | CallingCallCollectResultStartOfInput
  | CallingCallCollectResultDigit
  | CallingCallCollectResultSpeech

export type CallingCallCollectEndState = Exclude<
  CallingCallCollectResult['type'],
  'start_of_input'
>

export type CallingCallCollectState = 'error' | 'collecting' | 'finished'
export interface CallingCallCollectEventParams {
  node_id: string
  call_id: string
  control_id: string
  result: CallingCallCollectResult
  final?: boolean
  state?: CallingCallCollectState
}

export interface CallingCallCollectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollect>
  params: CallingCallCollectEventParams
}

/**
 * 'calling.call.connect'
 */
export type CallingCallConnectState =
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected'
export type CallingCallConnectEventParams =
  | CallingCallConnectSuccessEventParams
  | CallingCallConnectFailedEventParams
export interface CallingCallConnectSuccessEventParams {
  node_id: string
  call_id: string
  tag: string
  connect_state: 'connecting' | 'connected' | 'disconnected'
  peer: {
    node_id: string
    call_id: string
    tag: string
    device: CallingCallDevice
  }
}
export interface CallingCallConnectFailedEventParams {
  node_id: string
  call_id: string
  tag: string
  connect_state: 'failed'
  failed_reason: string
}

export interface CallingCallConnectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnect>
  params: CallingCallConnectEventParams
}

/**
 * 'calling.call.send_digits
 */

export type CallingCallSendDigitsState = 'finished'
export interface CallingCallSendDigitsEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallSendDigitsState
}

export interface CallingCallSendDigitsEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallSendDigits>
  params: CallingCallSendDigitsEventParams
}

/**
 * ==========
 * ==========
 * SDK-Side Events
 * ==========
 * ==========
 */

/**
 * 'calling.call.received'
 */
export interface CallReceivedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallReceived>
  params: CallingCallReceiveEventParams
}

/**
 * 'calling.prompt.started'
 */
export interface CallPromptStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptStarted>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.startOfInput'
 * Different from `started` because it's from the server
 */
export interface CallPromptStartOfInputEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptStartOfInput>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.updated'
 */
export interface CallPromptUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptUpdated>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.ended'
 */
export interface CallPromptEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptEnded>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.failed'
 */
export interface CallPromptFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptFailed>
  params: CallingCallCollectEventParams & { tag: string }
}

/**
 * 'calling.connect.connecting'
 */
export interface CallConnectConnectingEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectConnecting>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.connected'
 */
export interface CallConnectConnectedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectConnected>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.disconnected'
 */
export interface CallConnectDisconnectedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectDisconnected>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.failed'
 */
export interface CallConnectFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectFailed>
  params: CallingCallConnectEventParams
}

/**
 * 'calling.collect.started'
 */
export interface CallCollectStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectStarted>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.startOfInput'
 * Different from `started` because it's from the server
 */
export interface CallCollectStartOfInputEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectStartOfInput>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.updated'
 */
export interface CallCollectUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectUpdated>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.ended'
 */
export interface CallCollectEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectEnded>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.failed'
 */
export interface CallCollectFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectFailed>
  params: CallingCallCollectEventParams & { tag: string }
}

// interface VoiceCallStateEvent {
//   call_id: string
//   node_id: string
//   tag: string
// }

// /**
//  * 'voice.call.created'
//  */
// export interface VoiceCallCreatedEventParams extends VoiceCallStateEvent {}

// export interface VoiceCallCreatedEvent extends SwEvent {
//   event_type: ToInternalVoiceEvent<CallCreated>
//   params: VoiceCallCreatedEventParams
// }

// /**
//  * 'voice.call.ended'
//  */
// export interface VoiceCallEndedEventParams extends VoiceCallStateEvent {}

// export interface VoiceCallEndedEvent extends SwEvent {
//   event_type: ToInternalVoiceEvent<CallEnded>
//   params: VoiceCallEndedEventParams
// }

export type VoiceCallEvent =
  | VoiceCallPlaybackEvent
  | VoiceCallRecordingEvent
  | VoiceCallDetectEvent
  | VoiceCallTapEvent
  // Server Events
  | CallingCallDialEvent
  | CallingCallStateEvent
  | CallingCallReceiveEvent
  | CallingCallCollectEvent
  | CallingCallConnectEvent
  | CallingCallSendDigitsEvent
  // SDK Events
  | CallReceivedEvent
  | CallPromptStartedEvent
  | CallPromptStartOfInputEvent
  | CallPromptUpdatedEvent
  | CallPromptEndedEvent
  | CallPromptFailedEvent
  | CallConnectConnectingEvent
  | CallConnectConnectedEvent
  | CallConnectDisconnectedEvent
  | CallConnectFailedEvent
  | CallCollectStartedEvent
  | CallCollectStartOfInputEvent
  | CallCollectUpdatedEvent
  | CallCollectEndedEvent
  | CallCollectFailedEvent

export type VoiceCallEventParams =
  | VoiceCallPlaybackEventParams
  | VoiceCallRecordingEventParams
  | VoiceCallDetectEventParams
  // Server Event Params
  | CallingCallDialEventParams
  | CallingCallStateEventParams
  | CallingCallReceiveEventParams
  | CallingCallCollectEventParams
  | CallingCallConnectEventParams
  | CallingCallSendDigitsEventParams
  // SDK Event Params
  | CallReceivedEvent['params']
  | CallPromptStartedEvent['params']
  | CallPromptStartOfInputEvent['params']
  | CallPromptUpdatedEvent['params']
  | CallPromptEndedEvent['params']
  | CallPromptFailedEvent['params']
  | CallConnectConnectingEvent['params']
  | CallConnectConnectedEvent['params']
  | CallConnectDisconnectedEvent['params']
  | CallConnectFailedEvent['params']
  | CallCollectStartedEvent['params']
  | CallCollectStartOfInputEvent['params']
  | CallCollectUpdatedEvent['params']
  | CallCollectEndedEvent['params']
  | CallCollectFailedEvent['params']

export type VoiceCallAction = MapToPubSubShape<VoiceCallEvent>

export type VoiceCallReceiveAction = MapToPubSubShape<CallingCallReceiveEvent>

export type VoiceCallStateAction = MapToPubSubShape<CallingCallStateEvent>

export type VoiceCallDialAction = MapToPubSubShape<CallingCallDialEvent>

export type VoiceCallCollectAction = MapToPubSubShape<CallingCallCollectEvent>

export type VoiceCallSendDigitsAction =
  MapToPubSubShape<CallingCallSendDigitsEvent>

export type VoiceCallConnectAction = MapToPubSubShape<CallingCallConnectEvent>

export type VoiceCallJSONRPCMethod =
  | 'calling.dial'
  | 'calling.end'
  | 'calling.pass'
  | 'calling.answer'
  | VoiceCallPlayMethod
  | VoiceCallRecordMethod
  | VoiceCallDetectMethod
  | VoiceCallTapMethod
  | 'calling.play_and_collect'
  | 'calling.play_and_collect.stop'
  | 'calling.play_and_collect.volume'
  | 'calling.connect'
  | 'calling.disconnect'
  | 'calling.send_digits'
  | 'calling.collect'
  | 'calling.collect.stop'
  | 'calling.collect.start_input_timers'
  | 'calling.pay'
