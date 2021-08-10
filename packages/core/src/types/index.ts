import type {
  VideoAPIEventParams,
  WebRTCMessageParams,
  InternalVideoEvent,
} from './video'
import type { SessionEvents } from '../utils/interfaces'

export interface SwEvent {
  event_channel: string
  timestamp: number
}

// prettier-ignore
export type SwEventParams =
  | VideoAPIEventParams
  | WebRTCMessageParams

// prettier-ignore
export type PubSubChannelEvents =
  | InternalVideoEvent
  | SessionEvents

export * from './video'
