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
    initial_timeout?: number
    end_silence_timeout?: number
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
  initial_timeout?: number
  partial_results?: boolean
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

  type: 'phone' | 'sip'
  device: any // FIXME:
  from: string
  to: string
  direction: 'inbound' | 'outbound'

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

interface CallingCall {
  call_id: string
  call_state: 'created' | 'ringing' | 'answered' | 'ending' | 'ended'
  context?: string
  tag?: string
  direction: 'inbound' | 'outbound'
  device: CallingCallDevice
  node_id: string
  segment_id: string
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
export interface CallingCallStateEventParams extends CallingCall {}

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

export type CallingCallPlayState = 'playing' | 'paused' | 'error' | 'finished'
/**
 * 'calling.call.play'
 */
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
 * 'calling.call.record'
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

export type VoiceCallEventParams =
  // Server Event Params
  | CallingCallDialEventParams
  | CallingCallStateEventParams
  | CallingCallReceiveEventParams
  | CallingCallPlayEventParams
  | CallingCallRecordEventParams
  | CallingCallCollectEventParams
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

export type CallingTransformType =
  | 'voiceCallReceived'
  | 'voiceCallPlayback'
  | 'voiceCallRecord'
  | 'voiceCallPrompt'
