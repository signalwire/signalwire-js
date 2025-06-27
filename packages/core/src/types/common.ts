export type PaginationCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

export type ClientContextMethod = 'signalwire.receive' | 'signalwire.unreceive'

/**
 * Private common event types
 */
export type CallPlay = 'call.play'
export type CallRecord = 'call.record'

/**
 * Public common event names
 */
export type PlaybackStarted = 'playback.started'
export type PlaybackUpdated = 'playback.updated'
export type PlaybackEnded = 'playback.ended'
export type PlaybackFailed = 'playback.failed'
export type RecordingStarted = 'recording.started'
export type RecordingUpdated = 'recording.updated'
export type RecordingEnded = 'recording.ended'
export type RecordingFailed = 'recording.failed'

export interface MemberCommandParams {
  memberId?: string
}
export interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
export interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}
