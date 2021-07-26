import type { VideoAPIEventParams, WebRTCMessageParams } from './video'

export interface SwEvent {
  event_channel: string
  timestamp: number
}

// prettier-ignore
export type SwEventParams =
  | VideoAPIEventParams
  | WebRTCMessageParams

export * from './video'
