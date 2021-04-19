export interface Emitter {
  on(eventName: string, handler: Function, once?: boolean): this
  once(eventName: string, handler: Function): this
  off(eventName: string, handler?: Function): this
  emit(eventName: string, ...args: any[]): boolean
  removeAllListeners(): this
}

export const makeEventPubSub = () => {
  const _queue: { [key: string]: Function[] } = {}
  const _uniqueKey = Symbol.for('sw-once-key')
  return class EventPubSub implements Emitter {
    on(eventName: string, handler: Function, once = false) {
      if (!_queue[eventName]) {
        _queue[eventName] = []
      }
      _queue[eventName].push(handler)
      handler[_uniqueKey] = once
      return this
    }

    once(eventName: string, handler: Function) {
      return this.on(eventName, handler, true)
    }

    off(eventName: string, handler: Function = null) {
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
  }
}
