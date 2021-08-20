import { Action } from '@reduxjs/toolkit'
import { uuid, logger } from './utils'
import { executeAction } from './redux'
import {
  ExecuteParams,
  ExecuteTransform,
  BaseComponentOptions,
  Emitter,
  ExecuteExtendedOptions,
  EventsPrefix,
  EventTransform,
  BaseEventHandler,
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

const identity: ExecuteTransform<any, any> = (payload) => payload

export class BaseComponent implements Emitter {
  /** @internal */
  readonly #uuid = uuid()

  /** @internal */
  get __uuid() {
    return this.#uuid
  }

  /** @internal */
  protected _eventsPrefix: EventsPrefix = ''
  private _eventsRegisterQueue = new Set<EventRegisterHandlers>()
  private _eventsEmitQueue = new Set<any>()
  private _eventsNamespace?: string
  private _requests = new Map()
  private _customSagaTriggers = new Map()
  private _destroyer?: () => void
  /**
   * A Namespace let us scope specific instances inside of a
   * particular product (like 'video.', 'chat.', etc.). For instance,
   * when working with a room, the namespace will let us send messages
   * to that specific room.
   */
  private _getNamespacedEvent(event: string | symbol) {
    if (typeof event === 'string' && this._eventsNamespace !== undefined) {
      return getNamespacedEvent({
        namespace: this._eventsNamespace,
        event,
      })
    }

    return event
  }
  /**
   * A prefix is a product, like `video` or `chat`.
   */
  private _getPrefixedEvent(event: string | symbol) {
    if (
      this._eventsPrefix &&
      typeof event === 'string' &&
      !event.startsWith(this._eventsPrefix)
    ) {
      return `${this._eventsPrefix}.${event}`
    }

    return event
  }
  /**
   * Collection of functions that will be executed before calling the
   * event handlers registered by the end user (when using the Emitter
   * interface).
   * @internal
   */
  protected _emitterTransforms: Map<string | symbol, EventTransform> = new Map()
  /**
   * Keeps track of the stable references used for registering events.
   */
  private _emitterListenersCache = new Map<BaseEventHandler, BaseEventHandler>()
  /**
   * List of events being registered through the EventEmitter
   * instance. These events include the `_eventsPrefix` but not the
   * `_eventsNamespace`
   */
  private _trackedEvents: (string | symbol)[] = []

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
    logger.trace('Adding event to the register queue', { event, fn, context })
    // @ts-ignore
    this._eventsRegisterQueue.add({
      type: options.type,
      params: options.params,
    })
    return this.emitter as EventEmitter<string | symbol, any>
  }

  /** @internal */
  private addEventToEmitQueue(event: string | symbol, args: any[]) {
    logger.trace('Adding to the emit queue', event)
    this._eventsEmitQueue.add({ event, args })
  }

  /** @internal */
  private shouldAddToQueue() {
    return this._eventsNamespace === undefined
  }

  /** @internal */
  private applyEventHandlerTransform(
    event: string | symbol,
    fn: (...args: any[]) => void
  ) {
    /**
     * Transforms are mapped using the "raw" event name (meaning, the
     * same event the end user will be consuming, i.e non-namespaced)
     */
    const transform = this._emitterTransforms.get(event)
    const handler = transform ? transform(fn) : fn
    this._emitterListenersCache.set(fn, handler)

    return handler
  }

  private getAndRemoveStableEventHandler(fn?: (...args: any[]) => void) {
    if (fn && this._emitterListenersCache.has(fn)) {
      const handler = this._emitterListenersCache.get(fn)
      this._emitterListenersCache.delete(fn)
      return handler
    }

    return fn
  }

  private trackEvent(event: string | symbol) {
    this._trackedEvents = Array.from(new Set(this._trackedEvents.concat(event)))
  }

  private _getOptionsFromParams<T extends any[]>(params: T): typeof params {
    const [event, ...rest] = params

    return [this._getPrefixedEvent(event), ...rest] as any as T
  }

  on(...params: Parameters<Emitter['on']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'on', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context] = this._getOptionsFromParams(params)
    const handler = this.applyEventHandlerTransform(event, fn)
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.trace('Registering event', namespacedEvent)
    this.trackEvent(event)
    return this.emitter.on(namespacedEvent, handler, context)
  }

  once(...params: Parameters<Emitter['once']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'once', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context] = this._getOptionsFromParams(params)
    const handler = this.applyEventHandlerTransform(event, fn)
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.trace('Registering event', namespacedEvent)
    this.trackEvent(event)
    return this.emitter.once(namespacedEvent, handler, context)
  }

  off(...params: Parameters<Emitter['off']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'off', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event, fn, context, once] = this._getOptionsFromParams(params)
    const handler = this.getAndRemoveStableEventHandler(fn)
    const namespacedEvent = this._getNamespacedEvent(event)
    logger.trace('Removing event listener', namespacedEvent)
    return this.emitter.off(namespacedEvent, handler, context, once)
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({ type: 'removeAllListeners', params })
      return this.emitter as EventEmitter<string | symbol, any>
    }

    const [event] = params
    if (event) {
      return this.off(event)
    }

    /**
     * Note that we're passing the non-namespaced event here.
     * `this.off` will take care of deriving the proper namespaced
     * event and handle transforms, etc.
     */
    this.eventNames().forEach((eventName) => {
      this.off(eventName)
    })

    return this.emitter as EventEmitter<string | symbol, any>
  }

  /** @internal */
  eventNames() {
    return this._trackedEvents
  }

  /** @internal */
  emit(event: string | symbol, ...args: any[]) {
    if (this.shouldAddToQueue()) {
      this.addEventToEmitQueue(event, args)
      return false
    }

    const prefixedEvent = this._getPrefixedEvent(event)
    const namespacedEvent = this._getNamespacedEvent(prefixedEvent)
    logger.trace('Emit on event:', namespacedEvent)
    return this.emitter.emit(namespacedEvent, ...args)
  }

  destroy() {
    this._destroyer?.()
    this.removeAllListeners()
  }

  /** @internal */
  execute<InputType = unknown, OutputType = unknown>(
    { method, params }: ExecuteParams,
    {
      transformResolve = identity,
      transformReject = identity,
    }: ExecuteExtendedOptions<InputType, OutputType> = {
      transformResolve: identity,
      transformReject: identity,
    }
  ) {
    return new Promise<OutputType>((resolve, reject) => {
      const requestId = uuid()
      this._requests.set(requestId, {
        resolve,
        reject,
        transformResolve,
        transformReject,
      })

      this.store.dispatch(
        executeAction({
          requestId,
          componentId: this.__uuid,
          method,
          params,
        })
      )
    })
  }

  /** @internal */
  triggerCustomSaga<T>(action: Action): Promise<T> {
    return new Promise((resolve, reject) => {
      const dispatchId = uuid()
      this._customSagaTriggers.set(dispatchId, { resolve, reject })

      this.store.dispatch({
        dispatchId,
        ...makeCustomSagaAction(this.__uuid, action),
      })
    })
  }

  /** @internal */
  settleCustomSagaTrigger<T>({
    dispatchId,
    payload,
    kind,
  }: {
    dispatchId: string
    payload?: T
    kind: 'resolve' | 'reject'
  }) {
    const actions = this._customSagaTriggers.get(dispatchId)
    if (actions) {
      actions[kind](payload)
      this._customSagaTriggers.delete(dispatchId)
    }
  }

  /** @internal */
  select<T>(selectorFn: (state: SDKState) => T) {
    return selectorFn(this.store.getState())
  }

  /** @internal */
  onError(component: any) {
    this._requests.forEach((value, key) => {
      /**
       * If component.errors[key] is undefined it means that the
       * request hasn't failed
       */
      if (component?.errors[key] !== undefined) {
        value.reject(value.transformReject(component.errors[key]))
        this._requests.delete(key)
      }
    })
  }

  /** @internal */
  onSuccess(component: any) {
    this._requests.forEach((value, key) => {
      /**
       * If component.responses[key] is undefined it means that the
       * request is not ready yet.
       */
      if (component?.responses[key] !== undefined) {
        value.resolve(value.transformResolve(component.responses[key]))
        this._requests.delete(key)
      }
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
