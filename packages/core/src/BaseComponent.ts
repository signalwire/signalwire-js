import { Action } from '@reduxjs/toolkit'
import { uuid, logger, toInternalEventName, isLocalEvent } from './utils'
import { executeAction } from './redux'
import {
  ExecuteParams,
  ExecuteTransform,
  BaseComponentOptions,
  ExecuteExtendedOptions,
  EventsPrefix,
  EventTransform,
} from './utils/interfaces'
import { EventEmitter } from './utils/EventEmitter'
import { SDKState } from './redux/interfaces'
import { makeCustomSagaAction } from './redux/actions'
import { OnlyStateProperties, EmitterContract } from './types'

type EventRegisterHandlers<EventTypes extends EventEmitter.ValidEventTypes> =
  | {
      type: 'on'
      params: Parameters<EmitterContract<EventTypes>['on']>
    }
  | {
      type: 'off'
      params: Parameters<EmitterContract<EventTypes>['off']>
    }
  | {
      type: 'once'
      params: Parameters<EmitterContract<EventTypes>['once']>
    }
  | {
      type: 'removeAllListeners'
      params: [event: EventEmitter.EventNames<EventTypes>]
    }

const identity: ExecuteTransform<any, any> = (payload) => payload

export class BaseComponent<
  EventTypes extends EventEmitter.ValidEventTypes,
  StateProperties = Record<string, unknown>
> implements EmitterContract<EventTypes>
{
  /** @internal */
  private readonly uuid = uuid()

  /** @internal */
  get __uuid() {
    return this.uuid
  }

  /** @internal */
  protected _eventsPrefix: EventsPrefix = ''
  private _eventsRegisterQueue = new Set<EventRegisterHandlers<EventTypes>>()
  private _eventsEmitQueue = new Set<any>()
  private _eventsNamespace?: string
  private _eventsTransformsCache = new Map<
    EventEmitter.EventNames<EventTypes>,
    BaseComponent<EventTypes>
  >()
  private _requests = new Map()
  private _customSagaTriggers = new Map()
  private _destroyer?: () => void

  /**
   * A Namespace let us scope specific instances inside of a
   * particular product (like 'video.', 'chat.', etc.). For instance,
   * when working with a room, the namespace will let us send messages
   * to that specific room.
   */
  private _getNamespacedEvent(event: EventEmitter.EventNames<EventTypes>) {
    let namespace = this._eventsNamespace

    // TODO: explain why we're using a diff namespace for local events.
    if (typeof event === 'string' && isLocalEvent(event)) {
      namespace = this.__uuid
    }

    return toInternalEventName({
      event,
      namespace,
    })
  }

  /**
   * A prefix is a product, like `video` or `chat`.
   */
  private _getPrefixedEvent(event: EventEmitter.EventNames<EventTypes>) {
    if (
      this._eventsPrefix &&
      typeof event === 'string' &&
      !event.includes(`${this._eventsPrefix}.`)
    ) {
      return `${this._eventsPrefix}.${event}` as EventEmitter.EventNames<EventTypes>
    }

    return event
  }

  private _getInternalEvent(event: EventEmitter.EventNames<EventTypes>) {
    return this._getNamespacedEvent(this._getPrefixedEvent(event))
  }

  /**
   * Collection of functions that will be executed before calling the
   * event handlers registered by the end user (when using the Emitter
   * interface).
   */
  private _emitterTransforms: Map<
    EventEmitter.EventNames<EventTypes>,
    EventTransform
  > = new Map()

  /**
   * Keeps track of the stable references used for registering events.
   */
  private _emitterListenersCache = new Map<
    EventEmitter.EventNames<EventTypes>,
    Map<
      EventEmitter.EventListener<
        EventTypes,
        EventEmitter.EventNames<EventTypes>
      >,
      EventEmitter.EventListener<
        EventTypes,
        EventEmitter.EventNames<EventTypes>
      >
    >
  >()
  /**
   * List of events being registered through the EventEmitter
   * instance. These events include the `_eventsPrefix` but not the
   * `_eventsNamespace`
   */
  private _trackedEvents: Array<EventEmitter.EventNames<EventTypes>> = []

  constructor(public options: BaseComponentOptions<EventTypes>) {}

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
  private addEventToRegisterQueue(options: EventRegisterHandlers<EventTypes>) {
    const [event, fn] = options.params
    logger.trace('Adding event to the register queue', { event, fn })
    // @ts-ignore
    this._eventsRegisterQueue.add({
      type: options.type,
      params: options.params,
    })
    return this.emitter as EventEmitter<EventTypes>
  }

  /** @internal */
  private _addEventToEmitQueue(
    event: EventEmitter.EventNames<EventTypes>,
    args: any[]
  ) {
    logger.trace('Adding to the emit queue', event)
    this._eventsEmitQueue.add({ event, args })
  }

  /**
   * Take into account that `this._eventsNamespace` can be
   * intercepted by a wrapping Proxy object. We use this
   * extensibily for wrapping instances of the BaseConsumer
   * and event handlers instances.
   * @internal
   **/
  private shouldAddToQueue() {
    return this._eventsNamespace === undefined
  }

  /** @internal */
  private runAndCacheEventHandlerTransform({
    internalEvent,
    transform,
    payload,
  }: {
    internalEvent: EventEmitter.EventNames<EventTypes>
    transform: EventTransform
    payload: unknown
  }): BaseComponent<EventTypes> {
    if (!this._eventsTransformsCache.has(internalEvent)) {
      const instance = transform.instanceFactory(payload)
      this._eventsTransformsCache.set(internalEvent, instance)

      return instance
    }

    // @ts-expect-error
    return this._eventsTransformsCache.get(internalEvent)
  }

  /** @internal */
  private cleanupEventHandlerTransformCache({
    internalEvent,
    force,
  }: {
    internalEvent: EventEmitter.EventNames<EventTypes>
    force: boolean
  }) {
    const instance = this._eventsTransformsCache.get(internalEvent)
    const eventCount = this.listenerCount(internalEvent)

    if (instance && (force || eventCount <= 1)) {
      instance.destroy()
      return this._eventsTransformsCache.delete(internalEvent)
    }

    logger.debug(
      `[cleanupEventHandlerTransformCache] Key wasn't cached`,
      internalEvent
    )
    return false
  }

  /**
   * Transforms are mapped using the "prefixed" event name (i.e
   * non-namespaced sent by the server with the _eventPrefix) and
   * then mapped again using the end-user `fn` reference.
   * @internal
   */
  private getEmitterListenersMapByInternalEventName(
    internalEvent: EventEmitter.EventNames<EventTypes>
  ) {
    return (
      this._emitterListenersCache.get(internalEvent) ??
      new Map<
        EventEmitter.EventListener<
          EventTypes,
          EventEmitter.EventNames<EventTypes>
        >,
        EventEmitter.EventListener<
          EventTypes,
          EventEmitter.EventNames<EventTypes>
        >
      >()
    )
  }

  private getAndRemoveStableEventHandler(
    internalEvent: EventEmitter.EventNames<EventTypes>,
    fn?: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    const cacheByEventName =
      this.getEmitterListenersMapByInternalEventName(internalEvent)
    if (fn && cacheByEventName.has(fn)) {
      const handler = cacheByEventName.get(fn)
      cacheByEventName.delete(fn)
      this._emitterListenersCache.set(internalEvent, cacheByEventName)
      return handler
    }

    return fn
  }

  /**
   * Creates the event handler to be attached to the `EventEmitter`.
   * It contains the logic for applying any custom transforms for
   * specific events along with the logic for caching the calls to
   * `transform.instanceFactory`
   **/
  private _createStableEventHandler(
    internalEvent: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    const wrapperHandler = (payload: unknown) => {
      const transform = this._emitterTransforms.get(internalEvent)
      if (!transform) {
        // @ts-expect-error
        return fn(payload)
      }

      const cachedInstance = this.runAndCacheEventHandlerTransform({
        internalEvent,
        transform,
        payload,
      })

      const transformedPayload = transform.payloadTransform(payload)
      const proxiedObj = new Proxy(cachedInstance, {
        get(target: any, prop: any, receiver: any) {
          if (
            prop === '_eventsNamespace' &&
            transform.getInstanceEventNamespace
          ) {
            return transform.getInstanceEventNamespace(payload)
          }
          if (prop === 'eventChannel' && transform.getInstanceEventChannel) {
            return transform.getInstanceEventChannel(payload)
          }

          if (prop in transformedPayload) {
            return transformedPayload[prop]
          }

          return Reflect.get(target, prop, receiver)
        },
      })

      // @ts-expect-error
      return fn(proxiedObj)
    }
    return wrapperHandler as EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  }

  private getOrCreateStableEventHandler(
    internalEvent: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    const cacheByEventName =
      this.getEmitterListenersMapByInternalEventName(internalEvent)
    let handler = cacheByEventName.get(fn)

    if (!handler) {
      handler = this._createStableEventHandler(internalEvent, fn)
      cacheByEventName.set(fn, handler)
      this._emitterListenersCache.set(internalEvent, cacheByEventName)
    }

    return handler
  }

  /**
   * Since the EventEmitter instance (this.emitter) is
   * shared across the whole app each BaseComponent instance
   * will have to keep track of their own events so if/when
   * the user calls `removeAllListeners` we only clean the
   * events this instance cares/controls.
   */
  private _trackEvent(internalEvent: EventEmitter.EventNames<EventTypes>) {
    this._trackedEvents = Array.from(
      new Set(this._trackedEvents.concat(internalEvent))
    )
  }

  private _untrackEvent(internalEvent: EventEmitter.EventNames<EventTypes>) {
    this._trackedEvents = this._trackedEvents.filter(
      (evt) => evt !== internalEvent
    )
  }

  private _addListener<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>,
    once?: boolean
  ) {
    const type: EventRegisterHandlers<EventTypes>['type'] = once ? 'once' : 'on'
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type,
        params: [event, fn] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }
    const internalEvent = this._getInternalEvent(event)
    const wrappedHandler = this.getOrCreateStableEventHandler(
      internalEvent,
      fn as any
    )
    logger.trace('Registering event', internalEvent)
    this._trackEvent(internalEvent)
    return this.emitter[type](internalEvent, wrappedHandler)
  }

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this._addListener(event, fn)
  }

  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this._addListener(event, fn, true)
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type: 'off',
        params: [event, fn] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }

    const internalEvent = this._getInternalEvent(event)
    const handler = this.getAndRemoveStableEventHandler(
      internalEvent,
      fn as any
    )
    this.cleanupEventHandlerTransformCache({
      internalEvent,
      /**
       * If handler is not defined we'll force the cleanup
       * since the `emitter` will remove all the handlers
       * for the specified event
       */
      force: !handler,
    })
    logger.trace('Removing event listener', internalEvent)
    this._untrackEvent(internalEvent)
    return this.emitter.off(internalEvent, handler)
  }

  removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(event?: T) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type: 'removeAllListeners',
        params: [event] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }

    if (event) {
      return this.off(event)
    }

    this.eventNames().forEach((eventName) => {
      this.off(eventName)
    })

    return this.emitter as EventEmitter<EventTypes>
  }

  /** @internal */
  eventNames() {
    return this._trackedEvents
  }

  /** @internal */
  emit(event: EventEmitter.EventNames<EventTypes>, ...args: any[]) {
    if (this.shouldAddToQueue()) {
      this._addEventToEmitQueue(event, args)
      return false
    }

    const internalEvent = this._getInternalEvent(event)
    logger.trace('Emit on event:', internalEvent)
    // @ts-ignore
    return this.emitter.emit(internalEvent, ...args)
  }

  /** @internal */
  listenerCount<T extends EventEmitter.EventNames<EventTypes>>(event: T) {
    return this.emitter.listenerCount(event)
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
  getStateProperty(param: keyof OnlyStateProperties<StateProperties>) {
    // @ts-expect-error
    return this[param]
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
  protected _attachListeners(namespace?: string) {
    if (typeof namespace === 'string') {
      this._eventsNamespace = namespace
    }
    this.flushEventsQueue()
  }

  /**
   * Returns a structure with the emitter transforms that we want to `apply`
   * for each BaseConsumer. This allow us to define a static structure for
   * each class and later consume it within `applyEmitterTransforms`.
   * @internal
   */
  protected getEmitterTransforms(): Map<string | string[], EventTransform> {
    return new Map()
  }

  /**
   * Loop through the `getEmitterTransforms` Map and translate those into the
   * internal `_emitterTransforms` Map to quickly select & use the transform starting
   * from the server-side event.
   * @internal
   */
  protected applyEmitterTransforms() {
    this.getEmitterTransforms().forEach((handlersObj, key) => {
      if (Array.isArray(key)) {
        key.forEach((k) =>
          this._emitterTransforms.set(
            this._getInternalEvent(k as EventEmitter.EventNames<EventTypes>),
            handlersObj
          )
        )
      } else {
        this._emitterTransforms.set(
          this._getInternalEvent(key as EventEmitter.EventNames<EventTypes>),
          handlersObj
        )
      }
    })
  }
}
