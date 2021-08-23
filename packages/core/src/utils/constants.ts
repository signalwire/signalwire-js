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

/**
 * Used to not duplicate member fields across constants and types
 * and generate `MEMBER_UPDATED_EVENTS` below.
 * `key`: `type`
 */
const MEMBER_UPDATABLE_FIELDS = {
  video_muted: true,
  audio_muted: true,
  deaf: true,
  on_hold: true,
  output_volume: 1,
  input_sensitivity: true,
  input_volume: 1,
  visible: true,
}

export type RoomMemberUpdatableProperties = typeof MEMBER_UPDATABLE_FIELDS
export const MEMBER_UPDATED_EVENTS = [
  'member.updated' as const,
  ...Object.keys(MEMBER_UPDATABLE_FIELDS).map((key) => {
    return `member.updated.${
      key as keyof RoomMemberUpdatableProperties
    }` as const
  }),
]

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
