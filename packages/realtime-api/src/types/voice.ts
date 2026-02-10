import type {
  CallReceived,
  CallState,
  PlaybackStarted,
  PlaybackUpdated,
  PlaybackEnded,
  PlaybackFailed,
  RecordingStarted,
  RecordingUpdated,
  RecordingEnded,
  RecordingFailed,
  CallPromptStarted,
  CallPromptUpdated,
  CallPromptEnded,
  CallPromptFailed,
  CallTapStarted,
  CallTapEnded,
  CallCollectStarted,
  CallCollectStartOfInput,
  CallCollectUpdated,
  CallCollectEnded,
  CallCollectFailed,
  VoiceCallPlayAudioMethodParams,
  VoiceCallPlaySilenceMethodParams,
  VoiceCallPlayRingtoneMethodParams,
  VoiceCallPlayTTSMethodParams,
  VoicePlaylist,
  VoiceCallRecordMethodParams,
  VoiceCallPromptTTSMethodParams,
  VoiceCallPromptRingtoneMethodParams,
  VoiceCallPromptAudioMethodParams,
  VoiceCallPromptMethodParams,
  VoiceCallCollectMethodParams,
  VoiceCallTapMethodParams,
  VoiceCallTapAudioMethodParams,
  CallDetectStarted,
  CallDetectEnded,
  CallDetectUpdated,
  VoiceCallDetectMethodParams,
  VoiceCallDetectMachineParams,
  VoiceCallDetectFaxParams,
  VoiceCallDetectDigitParams,
  VoiceDialerParams,
  VoiceCallDialPhoneMethodParams,
  VoiceCallDialSipMethodParams,
} from '@signalwire/core'
import type { Call } from '../voice/Call'
import type { CallPlayback } from '../voice/CallPlayback'
import type { CallRecording } from '../voice/CallRecording'
import type { CallPrompt } from '../voice/CallPrompt'
import type { CallTap } from '../voice/CallTap'
import type { CallCollect } from '../voice/CallCollect'
import type { CallDetect } from '../voice/CallDetect'

/**
 * Voice API
 */
export interface VoiceListeners {
  onCallReceived?: (call: Call) => unknown
}

export type VoiceEvents = Record<CallReceived, (call: Call) => void>

export type VoiceListenersEventsMapping = Record<'onCallReceived', CallReceived>

export interface VoiceMethodsListeners {
  listen?: RealTimeCallListeners
}

export type VoiceDialMethodParams = VoiceDialerParams & VoiceMethodsListeners

export type VoiceDialPhonelMethodParams = VoiceCallDialPhoneMethodParams &
  VoiceMethodsListeners

export type VoiceDialSipMethodParams = VoiceCallDialSipMethodParams &
  VoiceMethodsListeners

/**
 * Call API
 */
export interface RealTimeCallListeners {
  onStateChanged?: (call: Call) => unknown
  onPlaybackStarted?: (playback: CallPlayback) => unknown
  onPlaybackUpdated?: (playback: CallPlayback) => unknown
  onPlaybackFailed?: (playback: CallPlayback) => unknown
  onPlaybackEnded?: (playback: CallPlayback) => unknown
  onRecordingStarted?: (recording: CallRecording) => unknown
  onRecordingFailed?: (recording: CallRecording) => unknown
  onRecordingEnded?: (recording: CallRecording) => unknown
  onPromptStarted?: (prompt: CallPrompt) => unknown
  onPromptUpdated?: (prompt: CallPrompt) => unknown
  onPromptFailed?: (prompt: CallPrompt) => unknown
  onPromptEnded?: (prompt: CallPrompt) => unknown
  onCollectStarted?: (collect: CallCollect) => unknown
  onCollectInputStarted?: (collect: CallCollect) => unknown
  onCollectUpdated?: (collect: CallCollect) => unknown
  onCollectFailed?: (collect: CallCollect) => unknown
  onCollectEnded?: (collect: CallCollect) => unknown
  onTapStarted?: (collect: CallTap) => unknown
  onTapEnded?: (collect: CallTap) => unknown
  onDetectStarted?: (collect: CallDetect) => unknown
  onDetectUpdated?: (collect: CallDetect) => unknown
  onDetectEnded?: (collect: CallDetect) => unknown
}

export type RealTimeCallListenersKeys = keyof RealTimeCallListeners

export type RealTimeCallEventsHandlerMapping = Record<
  CallState,
  (call: Call) => void
> &
  Record<
    PlaybackStarted | PlaybackUpdated | PlaybackEnded | PlaybackFailed,
    (playback: CallPlayback) => void
  > &
  Record<
    RecordingStarted | RecordingUpdated | RecordingEnded | RecordingFailed,
    (recording: CallRecording) => void
  > &
  Record<
    CallPromptStarted | CallPromptUpdated | CallPromptEnded | CallPromptFailed,
    (prompt: CallPrompt) => void
  > &
  Record<
    | CallCollectStarted
    | CallCollectStartOfInput
    | CallCollectUpdated
    | CallCollectEnded
    | CallCollectFailed,
    (callCollect: CallCollect) => void
  > &
  Record<CallTapStarted | CallTapEnded, (tap: CallTap) => void> &
  Record<
    CallDetectStarted | CallDetectUpdated | CallDetectEnded,
    (detect: CallDetect) => void
  >

export type RealTimeCallEvents = {
  [k in keyof RealTimeCallEventsHandlerMapping]: RealTimeCallEventsHandlerMapping[k]
}

export type RealtimeCallListenersEventsMapping = Record<
  'onStateChanged',
  CallState
> &
  Record<'onPlaybackStarted', PlaybackStarted> &
  Record<'onPlaybackUpdated', PlaybackUpdated> &
  Record<'onPlaybackFailed', PlaybackFailed> &
  Record<'onPlaybackEnded', PlaybackEnded> &
  Record<'onRecordingStarted', RecordingStarted> &
  Record<'onRecordingUpdated', RecordingUpdated> &
  Record<'onRecordingFailed', RecordingFailed> &
  Record<'onRecordingEnded', RecordingEnded> &
  Record<'onPromptStarted', CallPromptStarted> &
  Record<'onPromptUpdated', CallPromptUpdated> &
  Record<'onPromptFailed', CallPromptFailed> &
  Record<'onPromptEnded', CallPromptEnded> &
  Record<'onCollectStarted', CallCollectStarted> &
  Record<'onCollectInputStarted', CallCollectStartOfInput> &
  Record<'onCollectUpdated', CallCollectUpdated> &
  Record<'onCollectFailed', CallCollectFailed> &
  Record<'onCollectEnded', CallCollectEnded> &
  Record<'onTapStarted', CallTapStarted> &
  Record<'onTapEnded', CallTapEnded> &
  Record<'onDetectStarted', CallDetectStarted> &
  Record<'onDetectUpdated', CallDetectUpdated> &
  Record<'onDetectEnded', CallDetectEnded>

/**
 * Call Playback
 */
export type CallPlaybackEvents = Record<
  PlaybackStarted | PlaybackUpdated | PlaybackEnded | PlaybackFailed,
  (playback: CallPlayback) => void
>

export interface CallPlaybackListeners {
  onStarted?: (playback: CallPlayback) => unknown
  onUpdated?: (playback: CallPlayback) => unknown
  onFailed?: (playback: CallPlayback) => unknown
  onEnded?: (playback: CallPlayback) => unknown
}

export type CallPlaybackListenersEventsMapping = Record<
  'onStarted',
  PlaybackStarted
> &
  Record<'onUpdated', PlaybackUpdated> &
  Record<'onFailed', PlaybackFailed> &
  Record<'onEnded', PlaybackEnded>

export interface CallPlayMethodParams {
  playlist: VoicePlaylist
  listen?: CallPlaybackListeners
}

export interface CallPlayAudioMethodarams
  extends VoiceCallPlayAudioMethodParams {
  listen?: CallPlaybackListeners
}

export interface CallPlaySilenceMethodParams
  extends VoiceCallPlaySilenceMethodParams {
  listen?: CallPlaybackListeners
}

export interface CallPlayRingtoneMethodParams
  extends VoiceCallPlayRingtoneMethodParams {
  listen?: CallPlaybackListeners
}

export interface CallPlayTTSMethodParams extends VoiceCallPlayTTSMethodParams {
  listen?: CallPlaybackListeners
}

/**
 * Call Recording
 */
export type CallRecordingEvents = Record<
  RecordingStarted | RecordingUpdated | RecordingEnded | RecordingFailed,
  (recording: CallRecording) => void
>

export interface CallRecordingListeners {
  onStarted?: (recording: CallRecording) => unknown
  onUpdated?: (recording: CallRecording) => unknown
  onFailed?: (recording: CallRecording) => unknown
  onEnded?: (recording: CallRecording) => unknown
}

export type CallRecordingListenersEventsMapping = Record<
  'onStarted',
  RecordingStarted
> &
  Record<'onUpdated', RecordingUpdated> &
  Record<'onFailed', RecordingFailed> &
  Record<'onEnded', RecordingEnded>

export interface CallRecordMethodParams extends VoiceCallRecordMethodParams {
  listen?: CallRecordingListeners
}

export type CallRecordAudioMethodParams =
  VoiceCallRecordMethodParams['audio'] & {
    listen?: CallRecordingListeners
  }

/**
 * Call Prompt
 */
export type CallPromptEvents = Record<
  CallPromptStarted | CallPromptUpdated | CallPromptEnded | CallPromptFailed,
  (prompt: CallPrompt) => void
>

export interface CallPromptListeners {
  onStarted?: (prompt: CallPrompt) => unknown
  onUpdated?: (prompt: CallPrompt) => unknown
  onFailed?: (prompt: CallPrompt) => unknown
  onEnded?: (prompt: CallPrompt) => unknown
}

export type CallPromptListenersEventsMapping = Record<
  'onStarted',
  CallPromptStarted
> &
  Record<'onUpdated', CallPromptUpdated> &
  Record<'onFailed', CallPromptFailed> &
  Record<'onEnded', CallPromptEnded>

export type CallPromptMethodParams = VoiceCallPromptMethodParams & {
  listen?: CallPromptListeners
}

export type CallPromptAudioMethodParams = VoiceCallPromptAudioMethodParams & {
  listen?: CallPromptListeners
}

export type CallPromptRingtoneMethodParams =
  VoiceCallPromptRingtoneMethodParams & {
    listen?: CallPromptListeners
  }

export type CallPromptTTSMethodParams = VoiceCallPromptTTSMethodParams & {
  listen?: CallPromptListeners
}

/**
 * Call Collect
 */
export type CallCollectEvents = Record<
  | CallCollectStarted
  | CallCollectStartOfInput
  | CallCollectUpdated
  | CallCollectEnded
  | CallCollectFailed,
  (collect: CallCollect) => void
>

export interface CallCollectListeners {
  onStarted?: (collect: CallCollect) => unknown
  onInputStarted?: (collect: CallCollect) => unknown
  onUpdated?: (collect: CallCollect) => unknown
  onFailed?: (collect: CallCollect) => unknown
  onEnded?: (collect: CallCollect) => unknown
}

export type CallCollectListenersEventsMapping = Record<
  'onStarted',
  CallCollectStarted
> &
  Record<'onInputStarted', CallCollectStartOfInput> &
  Record<'onUpdated', CallCollectUpdated> &
  Record<'onFailed', CallCollectFailed> &
  Record<'onEnded', CallCollectEnded>

export type CallCollectMethodParams = VoiceCallCollectMethodParams & {
  listen?: CallCollectListeners
}

/**
 * Call Tap
 */
export type CallTapEvents = Record<
  CallTapStarted | CallTapEnded,
  (tap: CallTap) => void
>

export interface CallTapListeners {
  onStarted?: (tap: CallTap) => unknown
  onEnded?: (tap: CallTap) => unknown
}

export type CallTapListenersEventsMapping = Record<
  'onStarted',
  CallTapStarted
> &
  Record<'onEnded', CallTapEnded>

export type CallTapMethodParams = VoiceCallTapMethodParams & {
  listen?: CallTapListeners
}

export type CallTapAudioMethodParams = VoiceCallTapAudioMethodParams & {
  listen?: CallTapListeners
}

/**
 * Call Detect
 */
export type CallDetectEvents = Record<
  CallDetectStarted | CallDetectUpdated | CallDetectEnded,
  (tap: CallDetect) => void
>

export interface CallDetectListeners {
  onStarted?: (detect: CallDetect) => unknown
  onUpdated?: (detect: CallDetect) => unknown
  onEnded?: (detect: CallDetect) => unknown
}

export type CallDetectListenersEventsMapping = Record<
  'onStarted',
  CallDetectStarted
> &
  Record<'onUpdated', CallDetectUpdated> &
  Record<'onEnded', CallDetectEnded>

export type CallDetectMethodParams = VoiceCallDetectMethodParams & {
  listen?: CallDetectListeners
}

export interface CallDetectMachineParams
  extends Omit<VoiceCallDetectMachineParams, 'type'> {
  listen?: CallDetectListeners
}

export interface CallDetectFaxParams
  extends Omit<VoiceCallDetectFaxParams, 'type'> {
  listen?: CallDetectListeners
}

export interface CallDetectDigitParams
  extends Omit<VoiceCallDetectDigitParams, 'type'> {
  listen?: CallDetectListeners
}
