import type {
  CallReceived,
  CallPlaybackStarted,
  CallPlaybackUpdated,
  CallPlaybackEnded,
  CallRecordingStarted,
  CallRecordingUpdated,
  CallRecordingEnded,
  CallRecordingFailed,
} from '@signalwire/core'
import type { Call } from '../voice/Call'
import type { CallPlayback } from '../voice/CallPlayback'
import type { CallRecording } from '../voice/CallRecording'

export type RealTimeCallApiEventsHandlerMapping = Record<
  CallReceived,
  (call: Call) => void
> &
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
  >

export type RealTimeCallApiEvents = {
  [k in keyof RealTimeCallApiEventsHandlerMapping]: RealTimeCallApiEventsHandlerMapping[k]
}
