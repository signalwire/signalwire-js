import {
  STORAGE_PREFIX,
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
} from './constants'

export { v4 as uuid } from 'uuid'
export { logger } from './logger'
export * from './parseRPCResponse'

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

/**
 * Converts values from snake_case to camelCase
 * @internal
 */
const fromSnakeToCamelCase = (input: string) => {
  return input.split('_').reduce((reducer, part, index) => {
    const fc = part.trim().charAt(0)
    const remainingChars = part.substr(1).toLowerCase()

    return `${reducer}${
      index === 0 ? fc.toLowerCase() : fc.toUpperCase()
    }${remainingChars}`
  }, '')
}

/**
 * Converts a record from snake_case to camelCase properties
 * @internal
 */
export const toCamelCaseObject = (input: Record<string, unknown>) => {
  return Object.entries(input).reduce((reducer, [key, value]) => {
    reducer[fromSnakeToCamelCase(key)] = value
    return reducer
  }, {} as Record<string, unknown>)
}
