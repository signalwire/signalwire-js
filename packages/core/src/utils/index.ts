import {
  STORAGE_PREFIX,
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
  EVENT_NAMESPACE_DIVIDER,
} from './constants'

export { v4 as uuid } from 'uuid'
export { logger } from './logger'
export * from './parseRPCResponse'
export * from './toExternalJSON'
export * from './toInternalEventName'
export * from './extendComponent'

export const mutateStorageKey = (key: string) => `${STORAGE_PREFIX}${key}`

export const safeParseJson = (value: string): string | Object => {
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

export const timeoutPromise = (
  promise: Promise<unknown>,
  time: number,
  exception: any
) => {
  let timer: any = null
  return Promise.race([
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

export const cleanupEventNamespace = (event: string) => {
  const eventParts = event.split(EVENT_NAMESPACE_DIVIDER)
  return eventParts[eventParts.length - 1]
}

const WITH_CUSTOM_EVENT_NAMES = [
  'video.member.updated',
  'video.member.talking',
] as const
/**
 * Check and filter the events the user attached returning only the valid ones
 * for the server.
 * IE: `member.updated.audioMuted` means `member.updated` for the server.
 * @internal
 */
export const validateEventsToSubscribe = (events: (string | symbol)[]) => {
  const valid = events.map((internalEvent) => {
    if (typeof internalEvent === 'string') {
      const event = cleanupEventNamespace(internalEvent)
      const found = WITH_CUSTOM_EVENT_NAMES.find((withCustomName) => {
        return event.startsWith(withCustomName)
      })
      return found || event
    }

    return internalEvent
  })

  return Array.from(new Set(valid))
}
