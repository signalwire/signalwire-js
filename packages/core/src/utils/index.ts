import { STORAGE_PREFIX } from './constants'

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

/**
 * From the socket we can get:
 * - JSON-RPC msg with 1 level of 'result' or 'error'
 * - JSON-RPC msg with 2 nested 'result' and 'code' property to identify error
 * - JSON-RPC msg with 3 nested 'result' where the third level is the Verto JSON-RPC flat msg.
 *
 * @returns Object with error | result key to identify success or fail
 */
export const destructResponse = (
  response: any,
  nodeId: string = null
): { [key: string]: any } => {
  const { result = {}, error } = response
  if (error) {
    return { error }
  }
  const { result: nestedResult = null } = result
  if (nestedResult === null) {
    if (nodeId !== null) {
      result.node_id = nodeId
    }
    return { result }
  }
  const {
    code = null,
    node_id = null,
    result: vertoResult = null,
  } = nestedResult
  if (code && code !== '200') {
    return { error: nestedResult }
  }
  if (vertoResult) {
    return destructResponse(vertoResult, node_id)
  }
  if (code && node_id) {
    return { result: nestedResult }
  }
  return { result }
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
  let timer = null
  return Promise.race([
    promise,
    new Promise(
      (_resolve, reject) => (timer = setTimeout(reject, time, exception))
    ),
  ]).finally(() => clearTimeout(timer))
}
