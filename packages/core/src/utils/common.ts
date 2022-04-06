const UPPERCASE_REGEX = /[A-Z]/g
/**
 * Converts values from camelCase to snake_case
 * @internal
 */
export const fromCamelToSnakeCase = <T>(event: T): T => {
  // @ts-ignore
  return event.replace(UPPERCASE_REGEX, (letter) => {
    return `_${letter.toLowerCase()}`
  }) as T
}

type ValidTypes =
  | 'undefined'
  | 'null'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'set'
  | 'map'
  | 'function'
  | 'regexp'
  | 'date'
  | 'symbol'
  | 'bigint'
  | 'object'

export const typeOf = <T>(obj: T): ValidTypes => {
  if (obj === null) {
    return 'null'
  } else if (Array.isArray(obj)) {
    return 'array'
  } else if (obj !== Object(obj)) {
    return typeof obj
  }

  const result = {}.toString.call(obj).slice(8, -1).toLowerCase() as ValidTypes

  // strip function adornments (e.g. "AsyncFunction")
  return result.indexOf('function') > -1 ? 'function' : result
}
