import {
  Authorization,
  JSONRPCRequest,
  JSONRPCResponse,
  SATAuthorization,
} from '..'
import {
  STORAGE_PREFIX,
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
  EVENT_NAMESPACE_DIVIDER,
  LOCAL_EVENT_PREFIX,
  SYNTHETIC_EVENT_PREFIX,
} from './constants'
export { setLogger, getLogger, setDebugOptions } from './logger'
export { isWebrtcEventType, WEBRTC_EVENT_TYPES } from './common'

export { v4 as uuid } from 'uuid'
export * from './parseRPCResponse'
export * from './toExternalJSON'
export * from './toInternalEventName'
export * from './toInternalAction'
export * from './toSnakeCaseKeys'
export * from './extendComponent'
export * from './debounce'
export * from './SWCloseEvent'
export * from './eventUtils'
export * from './asyncRetry'

export { LOCAL_EVENT_PREFIX }

export const mutateStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`

export const safeParseJson = <T>(value: T): T | Object => {
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch (error) {
    return value
  }
}

const PROTOCOL_PATTERN = /^(ws|wss):\/\//
export const checkWebSocketHost = (host: string): string => {
  const protocol = PROTOCOL_PATTERN.test(host) ? '' : 'wss://'
  return `${protocol}${host}`
}

export const timeoutPromise = <T = unknown>(
  promise: Promise<T>,
  time: number,
  exception: any
) => {
  let timer: any = null
  return Promise.race<T>([
    promise,
    new Promise(
      (_resolve, reject) => (timer = setTimeout(reject, time, exception))
    ),
  ]).finally(() => clearTimeout(timer))
}

/** @internal */
export const isGlobalEvent = (event: string) => {
  // @ts-ignore
  return GLOBAL_VIDEO_EVENTS.includes(event)
}

/** @internal */
export const isInternalGlobalEvent = (event: string) => {
  // @ts-ignore
  return INTERNAL_GLOBAL_VIDEO_EVENTS.includes(event)
}

export const isSyntheticEvent = (event: string) => {
  return event.includes(SYNTHETIC_EVENT_PREFIX)
}

export const isSessionEvent = (event: string) => {
  return event.includes('session.')
}

export const getGlobalEvents = (kind: 'all' | 'video' = 'all') => {
  switch (kind) {
    case 'video':
      return GLOBAL_VIDEO_EVENTS
    default:
      // prettier-ignore
      return [
        ...GLOBAL_VIDEO_EVENTS,
      ]
  }
}

const cleanupEventNamespace = (event: string) => {
  const eventParts = event.split(EVENT_NAMESPACE_DIVIDER)
  return eventParts[eventParts.length - 1]
}

/**
 * These events have derived events generated by the SDK
 * i.e. member.updated.audioMuted or member.talking.started
 */
const WITH_CUSTOM_EVENT_NAMES = [
  'video.member.updated',
  'video.member.talking',
] as const

/**
 * These events are generated by the SDK to make them
 * more "user-friendly" while others are client-side only
 * like the WebRTC ones: `track`/`active`/`destroy` for Call objects.
 */
const CLIENT_SIDE_EVENT_NAMES = [
  'video.room.joined', // generated client-side
  'video.track',
  'video.active',
  'video.answering',
  'video.destroy',
  'video.early',
  'video.hangup',
  'video.held',
  'video.new',
  'video.purge',
  'video.recovering',
  'video.requesting',
  'video.ringing',
  'video.trying',
  'video.media.connected',
  'video.media.reconnecting',
  'video.media.disconnected',
  'video.microphone.updated',
  'video.camera.updated',
  'video.speaker.updated',
  'video.microphone.disconnected',
  'video.camera.disconnected',
  'video.speaker.disconnected',
]
/**
 * Check and filter the events the user attached returning only the valid ones
 * for the server.
 * IE: `member.updated.audioMuted` means `member.updated` for the server.
 * @internal
 */
export const validateEventsToSubscribe = <T = string>(events: T[]): T[] => {
  const valid = events.map((internalEvent) => {
    if (typeof internalEvent === 'string') {
      const event = cleanupEventNamespace(internalEvent)
      if (
        CLIENT_SIDE_EVENT_NAMES.includes(event) ||
        isSyntheticEvent(event) ||
        isLocalEvent(event) ||
        isSessionEvent(event)
      ) {
        return null
      }
      const found = WITH_CUSTOM_EVENT_NAMES.find((withCustomName) => {
        return event.startsWith(withCustomName)
      })
      return found || event
    }

    return internalEvent
  })

  return Array.from(new Set(valid)).filter(Boolean) as T[]
}

/**
 * "Local" events are events controlled by the SDK and the
 * server has no knowledge about them.
 */
export const isLocalEvent = (event: string) => {
  return event.includes(LOCAL_EVENT_PREFIX)
}

export const toLocalEvent = <T extends string>(event: string): T => {
  const eventParts = event.split('.')
  const prefix = eventParts[0]

  return event
    .split('.')
    .reduce((reducer, item) => {
      reducer.push(item)

      if (item === prefix) {
        reducer.push(LOCAL_EVENT_PREFIX)
      }

      return reducer
    }, [] as string[])
    .join('.') as T
}

export const toSyntheticEvent = <T extends string>(event: string): T => {
  const eventParts = event.split('.')
  const prefix = eventParts[0]

  return event
    .split('.')
    .reduce((reducer, item) => {
      reducer.push(item)

      if (item === prefix) {
        reducer.push(SYNTHETIC_EVENT_PREFIX)
      }

      return reducer
    }, [] as string[])
    .join('.') as T
}

export const isJSONRPCRequest = (
  e: JSONRPCRequest | JSONRPCResponse
): e is JSONRPCRequest => {
  return Boolean((e as JSONRPCRequest).method)
}

export const isJSONRPCResponse = (
  e: JSONRPCRequest | JSONRPCResponse
): e is JSONRPCResponse => {
  return !isJSONRPCRequest(e)
}

export const isSATAuth = (e?: Authorization): e is SATAuthorization => {
  return typeof e !== 'undefined' && 'jti' in e
}

export const isConnectRequest = (e: JSONRPCRequest | JSONRPCResponse) =>
  isJSONRPCRequest(e) && e.method == 'signalwire.connect'

export const isVertoInvite = (e: JSONRPCRequest | JSONRPCResponse) =>
  isJSONRPCRequest(e) &&
  e.method == 'webrtc.verto' &&
  e.params?.message.method === 'verto.invite'
