import type { VideoWorkerParams, WebRTCMessageParams } from './video'

export interface SwEvent {
  event_channel: string
  timestamp: number
}

// prettier-ignore
export type SwEventParams =
  | VideoWorkerParams
  | WebRTCMessageParams

export * from './video'
