import { uuid, logger } from './utils'
import { executeAction } from './redux'
import {
  ExecuteParams,
  BaseComponentOptions,
  Emitter,
} from './utils/interfaces'
import { EventEmitter, getNamespacedEvent } from './utils/EventEmitter'
import { SDKState } from './redux/interfaces'

export class BaseComponent implements Emitter {
  id = uuid()

  private _status: 'active' | 'inactive' = 'inactive'
  private _eventsRegisterQueue = new Set<
    | {
        type: 'on'
        params: Parameters<Emitter['on']>
      }
    | {
        type: 'off'
        params: Parameters<Emitter['off']>
      }
    | {
        type: 'once'
        params: Parameters<Emitter['once']>
      }
    | {
        type: 'removeAllListeners'
        params: Parameters<Emitter['removeAllListeners']>
      }
  >()
  private _eventsEmitQueue = new Set<any>()
  private _eventsNamespace: string
  private _requests = new Map()
  private _destroyer?: () => void
  private _getNamespacedEvent(event: string | symbol) {
    if (event && typeof event === 'string') {
      return getNamespacedEvent({
        namespace: this._eventsNamespace,
        event,
      })
    }

    return event
  }

  constructor(public options: BaseComponentOptions) {}

  /** @internal */
  set destroyer(d: () => void) {
    this._destroyer = d
  }

  /** @internal */
  get store() {
    return this.options.store
  }

  /** @internal */
  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter['on']>) {
    const [event, fn, context] = params

    if (this._status === 'active') {
      const namespacedEvent = this._getNamespacedEvent(event)
      logger.debug('Registering event', namespacedEvent)
      return this.emitter.on(namespacedEvent, fn, context)
    }

    logger.debug('Adding event to the register queue', { event, fn, context })
    this._eventsRegisterQueue.add({ type: 'on', params })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  once(...params: Parameters<Emitter['once']>) {
    const [event, fn, context] = params
    if (this._status === 'active') {
      const namespacedEvent = this._getNamespacedEvent(event)
      logger.debug('Registering event', namespacedEvent)
      return this.emitter.once(namespacedEvent, fn, context)
    }

    logger.debug('Adding event to the register queue', { event, fn, context })
    this._eventsRegisterQueue.add({ type: 'once', params })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  off(...params: Parameters<Emitter['off']>) {
    const [event, fn, context, once] = params
    if (this._status === 'active') {
      const namespacedEvent = this._getNamespacedEvent(event)
      logger.debug('Registering event', namespacedEvent)
      return this.emitter.off(namespacedEvent, fn, context, once)
    }

    logger.debug('Adding event to the register queue', { event, fn, context })
    this._eventsRegisterQueue.add({ type: 'off', params })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  emit(event: string | symbol, ...args: any[]) {
    if (this._status === 'active') {
      const namespacedEvent = this._getNamespacedEvent(event)
      logger.debug('Adding to the emit queue', namespacedEvent)
      return this.emitter.emit(namespacedEvent, ...args)
    }

    logger.debug('Adding to the emit queue', event)
    this._eventsEmitQueue.add({ event, args })
    return false
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    const [event] = params
    if (this._status === 'active') {
      return this.emitter.removeAllListeners(
        event ? this._getNamespacedEvent(event) : event
      )
    }

    logger.debug('Adding event to the register queue', { event })
    this._eventsRegisterQueue.add({ type: 'removeAllListeners', params })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  destroy() {
    this._destroyer?.()
    this.removeAllListeners()
  }

  /** @internal */
  execute({ method, params }: ExecuteParams) {
    return new Promise((resolve, reject) => {
      const requestId = uuid()
      this._requests.set(requestId, { resolve, reject })

      this.store.dispatch(
        executeAction({
          requestId,
          componentId: this.id,
          method,
          params,
        })
      )
    })
  }

  /** @internal */
  select<T>(selectorFn: (state: SDKState) => T) {
    return selectorFn(this.store.getState())
  }

  /** @internal */
  onError(component: any) {
    this._requests.forEach((value, key) => {
      value.reject(component.errors[key])
      this._requests.delete(key)
    })
  }

  /** @internal */
  onSuccess(component: any) {
    this._requests.forEach((value, key) => {
      value.resolve(component.responses[key])
      this._requests.delete(key)
    })
  }

  /** @internal */
  onConnect(namespace: string) {
    this._status = 'active'
    this._eventsNamespace = namespace

    this._eventsRegisterQueue.forEach((item) => {
      if (item.type === 'removeAllListeners') {
        const { type, params } = item
        this[type](...params)
      } else {
        const { type, params } = item
        // @ts-ignore
        this[type](...params)
      }
      this._eventsRegisterQueue.delete(item)
    })

    this._eventsEmitQueue.forEach((item) => {
      const { event, args } = item
      this.emit(event, ...args)
      this._eventsEmitQueue.delete(item)
    })
  }
}
