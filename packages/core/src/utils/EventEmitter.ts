import EventEmitter from 'eventemitter3'
import StrictEventEmitter from 'strict-event-emitter-types'
import { UserOptions } from './interfaces'

const REQUIRED_EMITTER_METHODS = [
  'on',
  'off',
  'once',
  'removeAllListeners',
  'emit',
]

/**
 * Checks the shape of the emitter at runtime. This is useful for when
 * the user is using the SDK without TS
 */
const assertEventEmitter = (emitter: unknown): emitter is EventEmitter => {
  if (
    emitter &&
    typeof emitter === 'object' &&
    REQUIRED_EMITTER_METHODS.every((name) => name in emitter)
  ) {
    return true
  }

  return false
}

const getEventEmitter = <T>(userOptions: UserOptions) => {
  if (!userOptions.emitter) {
    const emitter = new EventEmitter()
    return emitter as StrictEventEmitter<EventEmitter, T>
  } else if (assertEventEmitter(userOptions.emitter)) {
    return userOptions.emitter as unknown as StrictEventEmitter<EventEmitter, T>
  }
  // TODO: In future versions we can narrow this error a bit more and
  // give the user more info about which method they are missing as
  // well
  throw new Error(
    "The passed `emitter` doesn't expose the correct interface. Please check that your custom `emitter` comply with the `Emitter` interface."
  )
}

export { assertEventEmitter, EventEmitter, getEventEmitter }
