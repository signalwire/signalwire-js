import type {
  CallReceived,
  CallState,
  CallPlaybackStarted,
  CallPlaybackUpdated,
  CallPlaybackEnded,
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
    CallPlaybackStarted | CallPlaybackUpdated | CallPlaybackEnded,
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
