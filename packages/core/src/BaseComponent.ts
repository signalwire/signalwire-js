import { Action } from '@reduxjs/toolkit'
import { uuid, logger, getGlobalEvents } from './utils'
import { executeAction } from './redux'
import {
  ExecuteParams,
  BaseComponentOptions,
  Emitter,
} from './utils/interfaces'
import { EventEmitter, getNamespacedEvent } from './utils/EventEmitter'
import { SDKState } from './redux/interfaces'
import { makeCustomSagaAction } from './redux/actions'

type EventRegisterHandlers =
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

export class BaseComponent implements Emitter {
  id = uuid()
  private _eventsRegisterQueue = new Set<EventRegisterHandlers>()
  private _eventsEmitQueue = new Set<any>()
  private _eventsNamespace?: string
  private _requests = new Map()
  private _dispatchToCustomSagas = new Map()
  private _destroyer?: () => void
  private _getNamespacedEvent(event: string | symbol) {
    if (typeof event === 'string' && this._eventsNamespace !== undefined) {
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

  /** @internal */
  private addEventToRegisterQueue(options: EventRegisterHandlers) {
    const [event, fn, context] = options.params
    logger.debug('Adding event to the register queue', { event, fn, context })
    // @ts-ignore
    this._eventsRegisterQueue.add({
      type: options.type,
      params: options.params,
    })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  /** @internal */
  private addEventToEmitQueue(event: string | symbol, args: any[]) {
    logger.debug('Adding to the emit queue', event)
    this._eventsEmitQueue.add({ event, args })
  }

  /** @internal */
  private shouldAddToQueue() {
    return this._eventsNamespace === undefined
  }

  on(...params: Parameters<Emitter['on']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'on', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context] = params
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.debug('Registering event', namespacedEvent)
    return this.emitter.on(namespacedEvent, fn, context)
  }

  once(...params: Parameters<Emitter['once']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'once', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context] = params
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.debug('Registering event', namespacedEvent)
    return this.emitter.once(namespacedEvent, fn, context)
  }

  off(...params: Parameters<Emitter['off']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'off', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context, once] = params
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.debug('Registering event', namespacedEvent)
    return this.emitter.off(namespacedEvent, fn, context, once)
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'removeAllListeners', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event] = params
    if (event) {
      return this.emitter.removeAllListeners(this._getNamespacedEvent(event))
    }

    if (this._eventsNamespace !== undefined) {
      this.eventNames().forEach((event) => {
        if (
          typeof event === 'string' &&
          event.startsWith(this._eventsNamespace!)
        ) {
          this.emitter.removeAllListeners(event)
        } else if (typeof event === 'symbol') {
          logger.warn(
            'Remove events registered using `symbol` is not supported.'
          )
        }
      })
    } else {
      logger.debug('Removing global events only.')
      getGlobalEvents().forEach((event) => {
        this.emitter.removeAllListeners(event)
      })
    }

    return this.emitter as EventEmitter<string | symbol, any>
  }

  eventNames() {
    return this.emitter.eventNames()
  }

  emit(event: string | symbol, ...args: any[]) {
    if (this.shouldAddToQueue()) {
      this.addEventToEmitQueue(event, args)
      return false
    }

    const namespacedEvent = this._getNamespacedEvent(event)
    logger.debug('Adding to the emit queue', namespacedEvent)
    return this.emitter.emit(namespacedEvent, ...args)
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
  dispatchCustomSaga<T>(action: Action<T>) {
    return new Promise((resolve, reject) => {
      const dispatchId = uuid()
      this._dispatchToCustomSagas.set(dispatchId, { resolve, reject })

      this.store.dispatch({
        dispatchId,
        ...makeCustomSagaAction(this.id, action),
      })
    })
  }

  /** @internal */
  settleCustomSagaDispatch<T>({
    dispatchId,
    response,
    action,
  }: {
    dispatchId: string
    response: T
    action: 'resolve' | 'reject'
  }) {
    const actions = this._dispatchToCustomSagas.get(dispatchId)

    if (actions) {
      actions[action](response)
    }
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
  private flushEventsRegisterQueue() {
    this._eventsRegisterQueue.forEach((item) => {
      // @ts-ignore
      this[item.type](...item.params)
      this._eventsRegisterQueue.delete(item)
    })
  }

  /** @internal */
  private flushEventsEmitQueue() {
    this._eventsEmitQueue.forEach((item) => {
      const { event, args } = item
      this.emit(event, ...args)
      this._eventsEmitQueue.delete(item)
    })
  }

  /** @internal */
  private flushEventsQueue() {
    this.flushEventsRegisterQueue()
    this.flushEventsEmitQueue()
  }

  /** @internal */
  protected _attachListeners(namespace: string) {
    if (namespace === undefined) {
      logger.error('Tried to call `_attachListeners` without a `namespace`.')
      return
    }
    this._eventsNamespace = namespace
    this.flushEventsQueue()
  }
}
