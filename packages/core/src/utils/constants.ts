export const STORAGE_PREFIX = '@signalwire:'
export const ADD = 'add'
export const REMOVE = 'remove'
export const SESSION_ID = 'sessId'
export const DEFAULT_HOST = 'wss://relay.signalwire.com'

export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export const PRODUCT_PREFIX_VIDEO = 'video'

export const GLOBAL_VIDEO_EVENTS = ['room.started', 'room.ended'] as const

export const PRODUCT_PREFIXES = [PRODUCT_PREFIX_VIDEO] as const

export const MEMBER_EVENTS = ['member.joined', 'member.left'] as const

export const MEMBER_UPDATED_EVENTS = [
  'member.updated',
  'member.updated.video_muted',
  'member.updated.audio_muted',
  'member.updated.deaf',
  'member.updated.on_hold',
  'member.updated.output_volume',
  'member.updated.input_sensitivity',
  'member.updated.input_volume',
  'member.updated.visible',
] as const

export const MEMBER_TALKING_EVENTS = [
  'member.talking',
  'member.talking.start',
  'member.talking.stop',
] as const

/**
 * For internal usage only. These are the fully qualified event names
 * sent by the server
 */

/** @internal */
export const INTERNAL_GLOBAL_VIDEO_EVENTS = GLOBAL_VIDEO_EVENTS.map(
  (event) => `${PRODUCT_PREFIX_VIDEO}.${event}` as const
)

/** @internal */
export const INTERNAL_MEMBER_EVENTS = MEMBER_EVENTS.map(
  (event) => `${PRODUCT_PREFIX_VIDEO}.${event}` as const
)

/** @internal */
export const INTERNAL_MEMBER_UPDATED_EVENTS = MEMBER_UPDATED_EVENTS.map(
  (event) => `${PRODUCT_PREFIX_VIDEO}.${event}` as const
)

/** @internal */
export const INTERNAL_MEMBER_TALKING_EVENTS = MEMBER_TALKING_EVENTS.map(
  (event) => `${PRODUCT_PREFIX_VIDEO}.${event}` as const
)
