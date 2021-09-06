type ToInternalEventNameParams = {
  event: string | symbol
  namespace?: string
}

export const toInternalEventName = ({
  event,
  namespace,
}: ToInternalEventNameParams) => {
  if (typeof event === 'string') {
    // other transforms here..
    event = getNamespacedEvent({ event, namespace })
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

const getNamespacedEvent = ({
  namespace,
  event,
}: {
  event: string
  namespace?: string
}) => {
  /**
   * If getNamespacedEvent is called with the `namespace` already
   * present in the `event` or with a falsy namespace we'll return it
   * as is
   */
  if (!namespace || event.startsWith(namespace)) {
    return event
  }

  return `${namespace}:${event}`
}
