import type {
  CallReceived,
  CallState,
  CallPlaybackStarted,
  CallPlaybackUpdated,
  CallPlaybackEnded,
  CallPlaybackFailed,
  CallRecordingStarted,
  CallRecordingUpdated,
  CallRecordingEnded,
  CallRecordingFailed,
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
} from '@signalwire/core'
import type { Call } from '../voice/Call'
import type { CallPlayback } from '../voice/CallPlayback'
import type { CallRecording } from '../voice/CallRecording'
import type { CallPrompt } from '../voice/CallPrompt'
import type { CallTap } from '../voice/CallTap'
import type { CallCollect } from '../voice/CallCollect'

export type RealTimeCallApiEventsHandlerMapping = Record<
  CallReceived,
  (call: Call) => void
> &
  Record<CallState, (call: Call) => void> &
  Record<
    | CallPlaybackStarted
    | CallPlaybackUpdated
    | CallPlaybackEnded
    | CallPlaybackFailed,
    (playback: CallPlayback) => void
  > &
  Record<
    | CallRecordingStarted
    | CallRecordingUpdated
    | CallRecordingEnded
    | CallRecordingFailed,
    (recording: CallRecording) => void
  > &
  Record<
    CallPromptStarted | CallPromptUpdated | CallPromptEnded | CallPromptFailed,
    (prompt: CallPrompt) => void
  > &
  Record<CallTapStarted | CallTapEnded, (tap: CallTap) => void> &
  Record<
    | CallCollectStarted
    | CallCollectStartOfInput
    | CallCollectUpdated
    | CallCollectEnded
    | CallCollectFailed,
    (callCollect: CallCollect) => void
  >

export type RealTimeCallApiEvents = {
  [k in keyof RealTimeCallApiEventsHandlerMapping]: RealTimeCallApiEventsHandlerMapping[k]
}

// TODO: Remove the above old types

export type VoiceEvents = Record<CallReceived, (call: Call) => void>

export interface RealTimeCallListeners {
  onStateChanged?: (call: Call) => unknown
  onRecordingStarted?: (recording: CallRecording) => unknown
  onRecordingUpdated?: (recording: CallRecording) => unknown
  onRecordingFailed?: (recording: CallRecording) => unknown
  onRecordingEnded?: (recording: CallRecording) => unknown
  onPlaybackStarted?: (playback: CallPlayback) => unknown
  onPlaybackUpdated?: (playback: CallPlayback) => unknown
  onPlaybackFailed?: (playback: CallPlayback) => unknown
  onPlaybackEnded?: (playback: CallPlayback) => unknown
}

export type RealTimeCallListenersKeys = keyof RealTimeCallListeners

export type RealTimeCallEventsHandlerMapping = Record<
  CallState,
  (call: Call) => void
> &
  Record<
    | CallPlaybackStarted
    | CallPlaybackUpdated
    | CallPlaybackEnded
    | CallPlaybackFailed,
    (playback: CallPlayback) => void
  > &
  Record<
    | CallRecordingStarted
    | CallRecordingUpdated
    | CallRecordingEnded
    | CallRecordingFailed,
    (recording: CallRecording) => void
  > &
  Record<
    CallPromptStarted | CallPromptUpdated | CallPromptEnded | CallPromptFailed,
    (prompt: CallPrompt) => void
  > &
  Record<CallTapStarted | CallTapEnded, (tap: CallTap) => void> &
  Record<
    | CallCollectStarted
    | CallCollectStartOfInput
    | CallCollectUpdated
    | CallCollectEnded
    | CallCollectFailed,
    (callCollect: CallCollect) => void
  >

export type RealTimeCallEvents = {
  [k in keyof RealTimeCallEventsHandlerMapping]: RealTimeCallEventsHandlerMapping[k]
}

export type RealtimeCallListenersEventsMapping = Record<
  'onStateChanged',
  CallState
> &
  Record<'onPlaybackStarted', CallPlaybackStarted> &
  Record<'onPlaybackUpdated', CallPlaybackUpdated> &
  Record<'onPlaybackFailed', CallPlaybackFailed> &
  Record<'onPlaybackEnded', CallPlaybackEnded> &
  Record<'onRecordingStarted', CallRecordingStarted> &
  Record<'onRecordingUpdated', CallRecordingUpdated> &
  Record<'onRecordingFailed', CallRecordingFailed> &
  Record<'onRecordingEnded', CallRecordingEnded>

/**
 * Call Playback
 */
export type CallPlaybackEvents = Record<
  | CallPlaybackStarted
  | CallPlaybackUpdated
  | CallPlaybackEnded
  | CallPlaybackFailed,
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
  CallPlaybackStarted
> &
  Record<'onUpdated', CallPlaybackUpdated> &
  Record<'onFailed', CallPlaybackFailed> &
  Record<'onEnded', CallPlaybackEnded>

/**
 * Call Recording
 */
export type CallRecordingEvents = Record<
  | CallRecordingStarted
  | CallRecordingUpdated
  | CallRecordingEnded
  | CallRecordingFailed,
  (recording: CallRecording) => void
>

export interface CallRecordingListeners {
  onStarted?: (playback: CallPlayback) => unknown
  onUpdated?: (playback: CallPlayback) => unknown
  onFailed?: (playback: CallPlayback) => unknown
  onEnded?: (playback: CallPlayback) => unknown
}

export type CallRecordingListenersEventsMapping = Record<
  'onStarted',
  CallRecordingStarted
> &
  Record<'onUpdated', CallRecordingUpdated> &
  Record<'onFailed', CallRecordingFailed> &
  Record<'onEnded', CallRecordingEnded>
