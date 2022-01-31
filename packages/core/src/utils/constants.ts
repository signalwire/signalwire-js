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

/**
 * Used for namespacing events.
 */
export const EVENT_NAMESPACE_DIVIDER = ':'

export const LOCAL_EVENT_PREFIX = '__local__'
export const SYNTHETIC_EVENT_PREFIX = '__synthetic__'

export const PRODUCT_PREFIX_VIDEO = 'video'
export const PRODUCT_PREFIX_CANTINA = 'cantina-manager'
export const PRODUCT_PREFIX_CHAT = 'chat'

export const GLOBAL_VIDEO_EVENTS = ['room.started', 'room.ended'] as const

export const PRODUCT_PREFIXES = [
  PRODUCT_PREFIX_VIDEO,
  PRODUCT_PREFIX_CANTINA,
  PRODUCT_PREFIX_CHAT,
] as const

/**
 * For internal usage only. These are the fully qualified event names
 * sent by the server
 * @internal
 */
export const INTERNAL_GLOBAL_VIDEO_EVENTS = GLOBAL_VIDEO_EVENTS.map(
  (event) => `${PRODUCT_PREFIX_VIDEO}.${event}` as const
)
