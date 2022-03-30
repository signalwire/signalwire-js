import type {
  CallReceived,
  CallPlaybackStarted,
  CallPlaybackUpdated,
  CallPlaybackEnded,
} from '@signalwire/core'
import type { Call } from '../voice/Call'
import { CallPlayback } from '../voice/CallPlayback'

export type RealTimeCallApiEventsHandlerMapping = Record<
  CallReceived,
  (call: Call) => void
> &
  Record<
    CallPlaybackStarted | CallPlaybackUpdated | CallPlaybackEnded,
    (playback: CallPlayback) => void
  >

export type RealTimeCallApiEvents = {
  [k in keyof RealTimeCallApiEventsHandlerMapping]: RealTimeCallApiEventsHandlerMapping[k]
}
