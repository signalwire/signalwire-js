import { EVENT_NAMESPACE_DIVIDER } from './constants'
import { EventEmitter } from './EventEmitter'

type ToInternalEventNameParams<
  EventTypes extends EventEmitter.ValidEventTypes
> = {
  event: EventEmitter.EventNames<EventTypes>
  namespace?: string
}

export const toInternalEventName = <
  EventTypes extends EventEmitter.ValidEventTypes
>({
  event,
  namespace,
}: ToInternalEventNameParams<EventTypes>) => {
  // TODO: improve types of getNamespacedEvent and fromCamelToSnakeCase
  if (typeof event === 'string') {
    // other transforms here..
    event = getNamespacedEvent({
      event,
      namespace,
    }) as EventEmitter.EventNames<EventTypes>
    event = fromCamelToSnakeCase<EventEmitter.EventNames<EventTypes>>(event)
  }

  return event
}

const UPPERCASE_REGEX = /[A-Z]/g
/**
 * Converts values from camelCase to snake_case
 * @internal
 */
const fromCamelToSnakeCase = <T>(event: T): T => {
  // @ts-ignore
  return event.replace(UPPERCASE_REGEX, (letter) => {
    return `_${letter.toLowerCase()}`
  }) as T
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

  return `${namespace}${EVENT_NAMESPACE_DIVIDER}${event}`
}
