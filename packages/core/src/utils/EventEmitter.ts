import { Emitter, UserOptions } from './interfaces'

export const EventEmitter = () => {
  const _queue: { [key: string]: Function[] } = {}
  const _uniqueKey = Symbol.for('sw-once-key')
  return new (class BaseEventEmitter implements Emitter<BaseEventEmitter> {
    on(eventName: string, handler: Function, once = false) {
      if (!_queue[eventName]) {
        _queue[eventName] = []
      }
      _queue[eventName].push(handler)
      // @ts-ignore
      handler[_uniqueKey] = once
      return this
    }

    once(eventName: string, handler: Function) {
      return this.on(eventName, handler, true)
    }

    off(eventName: string, handler: Function | null = null) {
      if (!_queue[eventName]) {
        return this
      }

      if (!handler) {
        delete _queue[eventName]
        return this
      }

      const handlers = _queue[eventName]
      while (handlers.includes(handler)) {
        handlers.splice(handlers.indexOf(handler), 1)
      }
      if (!handlers.length) {
        delete _queue[eventName]
      }
      return this
    }

    emit(eventName: string, ...args: any[]) {
      if (!_queue[eventName]) {
        return false
      }
      const handlers = _queue[eventName]
      const deleteOnceHandled = []
      for (let handler of handlers) {
        handler(...args)
        // @ts-ignore
        if (handler[_uniqueKey]) {
          deleteOnceHandled.push(handler)
        }
      }
      for (let handler of deleteOnceHandled) {
        this.off(eventName, handler)
      }

      return true
    }

    removeAllListeners() {
      for (let eventName in _queue) {
        this.off(eventName)
      }

      return this
    }
  })()
}

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
export const assertEventEmitter = (emitter: unknown): emitter is Emitter => {
  if (
    emitter &&
    typeof emitter === 'object' &&
    REQUIRED_EMITTER_METHODS.every((name) => name in emitter)
  ) {
    return true
  }

  return false
}

export const getEventEmitter = (userOptions: UserOptions): Emitter => {
  if (!userOptions.emitter) {
    return EventEmitter()
  } else if (assertEventEmitter(userOptions.emitter)) {
    return userOptions.emitter
  }

  // TODO: In future versions we can narrow this error a bit more and
  // give the user more info about which method they are missing as
  // well
  throw new Error(
    "The passed `emitter` doesn't expose the correct interface. Please check that your custom `emitter` comply with the `Emitter` interface."
  )
}
