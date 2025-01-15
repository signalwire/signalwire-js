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

export type CallPlay = 'call.play'
export type PlaybackStarted = 'playback.started'
export type PlaybackUpdated = 'playback.updated'
export type PlaybackEnded = 'playback.ended'
export type PlaybackFailed = 'playback.failed'
