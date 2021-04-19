import { Emitter } from './interfaces'

export const EventPubSub = () => {
  const _queue: { [key: string]: Function[] } = {}
  const _uniqueKey = Symbol.for('sw-once-key')
  return new (class BaseEventPubSub implements Emitter<BaseEventPubSub> {
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
