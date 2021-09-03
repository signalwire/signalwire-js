export const toInternalEventName = (event: string | symbol) => {
  if (typeof event === 'string') {
    // other transforms here..
    event = fromCamelToSnakeCase(event)
  }

  return event
}

const UPPERCASE_REGEX = /[A-Z]/g
/**
 * Converts values from camelCase to snake_case
 * @internal
 */
const fromCamelToSnakeCase = (event: string) => {
  return event.replace(UPPERCASE_REGEX, (letter) => {
    return `_${letter.toLowerCase()}`
  })
}
