import {
  STORAGE_PREFIX,
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
} from './constants'

export { v4 as uuid } from 'uuid'
export { logger } from './logger'
export * from './parseRPCResponse'

export const deepCopy = (obj: Object) => JSON.parse(JSON.stringify(obj))

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

export const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export const roundToFixed = (value: number, num = 2) => {
  return Number(value.toFixed(num))
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
