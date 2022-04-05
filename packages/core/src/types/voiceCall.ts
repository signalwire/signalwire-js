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
type RingtoneName =
  | 'at'
  | 'au'
  | 'bg'
  | 'br'
  | 'be'
  | 'ch'
  | 'cl'
  | 'cn'
  | 'cz'
  | 'de'
  | 'dk'
  | 'ee'
  | 'es'
  | 'fi'
  | 'fr'
  | 'gr'
  | 'hu'
  | 'il'
  | 'in'
  | 'it'
  | 'lt'
  | 'jp'
  | 'mx'
  | 'my'
  | 'nl'
  | 'no'
  | 'nz'
  | 'ph'
  | 'pl'
  | 'pt'
  | 'ru'
  | 'se'
  | 'sg'
  | 'th'
  | 'uk'
  | 'us'
  | 'tw'
  | 've'
  | 'za'
/**
 * Private event types
 */
export type CallDial = 'call.dial'
export type CallState = 'call.state'
export type CallReceive = 'call.receive'
export type CallPlay = 'call.play'
export type CallRecord = 'call.record'
export type CallCollect = 'call.collect'
export type CallTap = 'call.tap'
export type CallConnect = 'call.connect'

/**
 * Public event types
 */
export type CallCreated = 'call.created'
export type CallEnded = 'call.ended'
export type CallReceived = 'call.received'
export type CallPlaybackStarted = 'playback.started'
export type CallPlaybackUpdated = 'playback.updated'
export type CallPlaybackEnded = 'playback.ended'
export type CallRecordingStarted = 'recording.started'
export type CallRecordingUpdated = 'recording.updated'
export type CallRecordingEnded = 'recording.ended'
export type CallRecordingFailed = 'recording.failed'
export type CallPromptStarted = 'prompt.started'
export type CallPromptUpdated = 'prompt.updated'
export type CallPromptEnded = 'prompt.ended'
export type CallPromptFailed = 'prompt.failed'
export type CallTapStarted = 'tap.started'
export type CallTapEnded = 'tap.ended'
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
  | CallPlaybackStarted
  | CallPlaybackUpdated
  | CallPlaybackEnded
  | CallRecordingStarted
  | CallRecordingUpdated
  | CallRecordingEnded
  | CallRecordingFailed
  | CallPromptStarted
  | CallPromptUpdated
  | CallPromptEnded
  | CallPromptFailed
  | CallTapStarted
  | CallTapEnded
  | CallConnectConnecting
  | CallConnectConnected
  | CallConnectDisconnected
  | CallConnectFailed

/**
 * List of internal events
 * @internal
 */
// export type InternalVoiceCallEventNames =
//   ToInternalVoiceEvent<VoiceCallEventNames>

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

export interface VoiceCallPlayAudioParams {
  type: 'audio'
  url: string
}

export interface VoiceCallPlayTTSParams {
  type: 'tts'
  text: string
  language?: string
  gender?: 'male' | 'female'
}

export interface VoiceCallPlaySilenceParams {
  type: 'silence'
  duration: number
}

export interface VoiceCallPlayRingtoneParams {
  type: 'ringtone'
  name: RingtoneName
  duration?: number
}

export type VoiceCallPlayParams =
  | VoiceCallPlayAudioParams
  | VoiceCallPlayTTSParams
  | VoiceCallPlaySilenceParams
  | VoiceCallPlayRingtoneParams

export interface VoiceCallPlayMethodParams {
  media: NestedArray<VoiceCallPlayParams>
  volume?: number
}

export interface VoiceCallPlayAudioMethodParams
  extends Omit<VoiceCallPlayAudioParams, 'type'> {
  volume?: number
}

export interface VoiceCallPlaySilenceMethodParams
  extends Omit<VoiceCallPlaySilenceParams, 'type'> {}

export interface VoiceCallPlayRingtoneMethodParams
  extends Omit<VoiceCallPlayRingtoneParams, 'type'> {
  volume?: number
}
export interface VoiceCallPlayTTSMethodParams
  extends Omit<VoiceCallPlayTTSParams, 'type'> {
  volume?: number
}

export interface VoiceCallRecordMethodParams {
  audio: {
    beep?: boolean
    format?: 'mp3' | 'wav'
    stereo?: boolean
    direction?: 'listen' | 'speak' | 'both'
    initialTimeout?: number
    endSilenceTimeout?: number
    terminators?: string
  }
}

type SpeechOrDigits =
  | {
      digits: {
        max: number
        digit_timeout?: number
        terminators?: string
      }
      speech?: never
    }
  | {
      digits?: never
      speech: {
        end_silence_timeout: number
        speech_timeout: number
        language: number
        hints: string[]
      }
    }
export type VoiceCallPromptMethodParams = SpeechOrDigits & {
  media: NestedArray<VoiceCallPlayParams>
  volume?: number
  initialTimeout?: number
  partialResults?: boolean
}
export type VoiceCallPromptAudioMethodParams = SpeechOrDigits &
  Omit<VoiceCallPlayAudioParams, 'type'> & {
    volume?: number
    initial_timeout?: number
    partial_results?: boolean
  }
export type VoiceCallPromptRingtoneMethodParams = SpeechOrDigits &
  Omit<VoiceCallPlayRingtoneParams, 'type'> & {
    volume?: number
    initial_timeout?: number
    partial_results?: boolean
  }
export type VoiceCallPromptTTSMethodParams = SpeechOrDigits &
  Omit<VoiceCallPlayTTSParams, 'type'> & {
    volume?: number
    initial_timeout?: number
    partial_results?: boolean
  }
type TapCodec = 'OPUS' | 'PCMA' | 'PCMU'
interface TapDeviceWS {
  type: 'ws'
  uri: string
  codec?: TapCodec
  rate?: number
}

interface TapDeviceRTP {
  type: 'rtp'
  addr: string
  port: string
  codec?: TapCodec
  ptime?: number
}

type TapDevice = TapDeviceWS | TapDeviceRTP
type TapDirection = 'listen' | 'speak' | 'both'
export interface VoiceCallTapMethodParams {
  device: TapDevice
  audio: {
    direction: TapDirection
  }
}

export interface VoiceCallTapAudioMethodParams {
  device: TapDevice
  direction: TapDirection
}

export interface VoiceCallConnectMethodParams {
  ringback?: NestedArray<VoiceCallPlayParams>
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
export interface VoiceCallPlaybackContract {
  /** Unique id for this playback */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly volume: number
  /** @ignore */
  readonly state: CallingCallPlayState

  pause(): Promise<this>
  resume(): Promise<this>
  stop(): Promise<this>
  setVolume(volume: number): Promise<this>
}

/**
 * VoiceCallPlayback properties
 */
export type VoiceCallPlaybackEntity =
  OnlyStateProperties<VoiceCallPlaybackContract>

/**
 * VoiceCallPlayback methods
 */
export type VoiceCallPlaybackMethods =
  OnlyFunctionProperties<VoiceCallPlaybackContract>

/**
 * Public Contract for a VoiceCallRecording
 */
export interface VoiceCallRecordingContract {
  /** Unique id for this recording */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly state?: CallingCallRecordState
  /** @ignore */
  readonly url?: string
  /** @ignore */
  readonly size?: number
  /** @ignore */
  readonly duration?: number

  stop(): Promise<this>
}

/**
 * VoiceCallRecording properties
 */
export type VoiceCallRecordingEntity =
  OnlyStateProperties<VoiceCallRecordingContract>

/**
 * VoiceCallRecording methods
 */
export type VoiceCallRecordingMethods =
  OnlyFunctionProperties<VoiceCallRecordingContract>

/**
 * Public Contract for a VoiceCallPrompt
 */
export interface VoiceCallPromptContract {
  /** Unique id for this recording */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string

  readonly type?: CallingCallCollectResult['type']
  /** Alias for type in case of errors */
  readonly reason?: string
  readonly digits?: string
  readonly terminator?: string
  readonly text?: string
  readonly confidence?: number

  stop(): Promise<this>
  setVolume(volume: number): Promise<this>
  waitForResult(): Promise<this>
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
 * Public Contract for a VoiceCallTap
 */
export interface VoiceCallTapContract {
  /** Unique id for this recording */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly state: CallingCallTapState

  stop(): Promise<this>
}

/**
 * VoiceCallTap properties
 */
export type VoiceCallTapEntity = OnlyStateProperties<VoiceCallTapContract>

/**
 * VoiceCallTap methods
 */
export type VoiceCallTapMethods = OnlyFunctionProperties<VoiceCallTapContract>

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

  type: 'phone' | 'sip'
  device: any // FIXME:
  from: string
  to: string
  direction: 'inbound' | 'outbound'
  headers?: SipHeader[]

  dial(params?: VoiceCallDialMethodParams): Promise<T>
  hangup(reason?: VoiceCallDisconnectReason): Promise<void>
  answer(): Promise<T>
  play(params: VoiceCallPlayMethodParams): Promise<VoiceCallPlaybackContract>
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
  tap(params: VoiceCallTapMethodParams): Promise<VoiceCallTapContract>
  tapAudio(params: VoiceCallTapAudioMethodParams): Promise<VoiceCallTapContract>
  connect(params: VoiceCallConnectMethodParams): Promise<VoiceCallContract>
  waitUntilConnected(): Promise<this>
  disconnect(): Promise<void>
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

interface CallingCallPhoneDevice {
  type: 'phone'
  params: {
    from_number: string
    to_number: string
    timeout: number
    max_duration: number
  }
}

interface CallingCallSIPDevice {
  type: 'sip'
  params: {
    from: string
    from_name?: string
    to: string
    timeout?: number
    max_duration?: number
    headers?: SipHeader[]
    codecs?: SipCodec[]
    webrtc_media?: boolean
  }
}

type CallingCallDevice = CallingCallPhoneDevice | CallingCallSIPDevice
type CallingCallState = 'created' | 'ringing' | 'answered' | 'ending' | 'ended'
interface CallingCall {
  call_id: string
  call_state: CallingCallState
  context?: string
  tag?: string
  direction: 'inbound' | 'outbound'
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
export interface CallingCallDialEventParams {
  node_id: string
  tag: string
  dial_state: 'dialing' | 'answered' | 'failed'
  call?: CallingCallDial
}

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
 * 'calling.call.play'
 */
export type CallingCallPlayState = 'playing' | 'paused' | 'error' | 'finished'
export interface CallingCallPlayEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallPlayState
}

export interface CallingCallPlayEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlay>
  params: CallingCallPlayEventParams
}

/**
 * 'calling.call.record'
 */
export type CallingCallRecordState = 'recording' | 'no_input' | 'finished'
export interface CallingCallRecordEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallRecordState
  url?: string
  duration?: number
  size?: number
  record: any // FIXME:
}

export interface CallingCallRecordEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecord>
  params: CallingCallRecordEventParams
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
  | CallingCallCollectResultDigit
  | CallingCallCollectResultSpeech

export interface CallingCallCollectEventParams {
  node_id: string
  call_id: string
  control_id: string
  result: CallingCallCollectResult
  final?: boolean
}

export interface CallingCallCollectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollect>
  params: CallingCallCollectEventParams
}

/**
 * 'calling.call.tap'
 */
export type CallingCallTapState = 'tapping' | 'finished'

interface CallingCallTapDeviceRTP {
  type: 'rtp'
  params: {
    addr: string
    port: number
    codec?: TapCodec
    ptime?: number
  }
}

interface CallingCallTapDeviceWS {
  type: 'ws'
  params: {
    uri: string
    codec?: TapCodec
    rate?: number
  }
}

interface CallingCallTapAudio {
  type: 'audio'
  params: {
    direction?: TapDirection
  }
}

export interface CallingCallTapEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallTapState
  tap: CallingCallTapAudio
  device: CallingCallTapDeviceRTP | CallingCallTapDeviceWS
}

export interface CallingCallTapEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTap>
  params: CallingCallTapEventParams
}

/**
 * 'calling.call.connect'
 */
export type CallingCallConnectState =
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected'
export interface CallingCallConnectEventParams {
  node_id: string
  call_id: string
  tag: string
  connect_state: CallingCallConnectState
  failed_reason?: string
  peer: {
    node_id: string
    call_id: string
    tag: string
    device: CallingCallDevice
  }
}

export interface CallingCallConnectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnect>
  params: CallingCallConnectEventParams
}

/**
 * ==========
 * ==========
 * SDK-Side Events
 * ==========
 * ==========
 */

/**
 * 'calling.playback.started'
 */
export interface CallPlaybackStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlaybackStarted>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.playback.updated'
 */
export interface CallPlaybackUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlaybackUpdated>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.playback.ended'
 */
export interface CallPlaybackEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlaybackEnded>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.call.received'
 */
export interface CallReceivedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallReceived>
  params: CallingCallReceiveEventParams
}

/**
 * 'calling.recording.started'
 */
export interface CallRecordingStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecordingStarted>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.updated'
 */
export interface CallRecordingUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecordingUpdated>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.ended'
 */
export interface CallRecordingEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecordingEnded>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.failed'
 */
export interface CallRecordingFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecordingFailed>
  params: CallingCallRecordEventParams & { tag: string }
}

/**
 * 'calling.prompt.started'
 */
export interface CallPromptStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptStarted>
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
 * 'calling.tap.started'
 */
export interface CallTapStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTapStarted>
  params: CallingCallTapEventParams & { tag: string }
}
/**
 * 'calling.tap.ended'
 */
export interface CallTapEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTapEnded>
  params: CallingCallTapEventParams & { tag: string }
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
  // Server Events
  | CallingCallDialEvent
  | CallingCallStateEvent
  | CallingCallReceiveEvent
  | CallingCallPlayEvent
  | CallingCallRecordEvent
  | CallingCallCollectEvent
  | CallingCallTapEvent
  | CallingCallConnectEvent
  // SDK Events
  | CallReceivedEvent
  | CallPlaybackStartedEvent
  | CallPlaybackUpdatedEvent
  | CallPlaybackEndedEvent
  | CallRecordingStartedEvent
  | CallRecordingUpdatedEvent
  | CallRecordingEndedEvent
  | CallRecordingFailedEvent
  | CallPromptStartedEvent
  | CallPromptUpdatedEvent
  | CallPromptEndedEvent
  | CallPromptFailedEvent
  | CallTapStartedEvent
  | CallTapEndedEvent
  | CallConnectConnectingEvent
  | CallConnectConnectedEvent
  | CallConnectDisconnectedEvent
  | CallConnectFailedEvent

export type VoiceCallEventParams =
  // Server Event Params
  | CallingCallDialEventParams
  | CallingCallStateEventParams
  | CallingCallReceiveEventParams
  | CallingCallPlayEventParams
  | CallingCallRecordEventParams
  | CallingCallCollectEventParams
  | CallingCallTapEventParams
  | CallingCallConnectEventParams
  // SDK Event Params
  | CallReceivedEvent['params']
  | CallPlaybackStartedEvent['params']
  | CallPlaybackUpdatedEvent['params']
  | CallPlaybackEndedEvent['params']
  | CallRecordingStartedEvent['params']
  | CallRecordingUpdatedEvent['params']
  | CallRecordingEndedEvent['params']
  | CallRecordingFailedEvent['params']
  | CallPromptStartedEvent['params']
  | CallPromptUpdatedEvent['params']
  | CallPromptEndedEvent['params']
  | CallPromptFailedEvent['params']
  | CallTapStartedEvent['params']
  | CallTapEndedEvent['params']
  | CallConnectConnectingEvent['params']
  | CallConnectConnectedEvent['params']
  | CallConnectDisconnectedEvent['params']
  | CallConnectFailedEvent['params']

export type VoiceCallAction = MapToPubSubShape<VoiceCallEvent>

export type VoiceCallJSONRPCMethod =
  | 'calling.dial'
  | 'calling.end'
  | 'calling.answer'
  | 'calling.play'
  | 'calling.play.pause'
  | 'calling.play.resume'
  | 'calling.play.volume'
  | 'calling.play.stop'
  | 'calling.record'
  | 'calling.record.stop'
  | 'calling.play_and_collect'
  | 'calling.play_and_collect.stop'
  | 'calling.play_and_collect.volume'
  | 'calling.tap'
  | 'calling.tap.stop'
  | 'calling.connect'
  | 'calling.disconnect'

export type CallingTransformType =
  | 'voiceCallReceived'
  | 'voiceCallPlayback'
  | 'voiceCallRecord'
  | 'voiceCallPrompt'
  | 'voiceCallTap'
  | 'voiceCallConnect'
  | 'voiceCallState'
