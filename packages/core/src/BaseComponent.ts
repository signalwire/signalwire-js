import { Action } from '@reduxjs/toolkit'
import { uuid, logger, toInternalEventName } from './utils'
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
    return toInternalEventName({
      event,
      namespace: this._eventsNamespace,
    })
  }
  /**
   * A prefix is a product, like `video` or `chat`.
   */
  private _getPrefixedEvent(event: EventEmitter.EventNames<EventTypes>) {
    if (
      this._eventsPrefix &&
      typeof event === 'string' &&
      !event.startsWith(this._eventsPrefix)
    ) {
      return `${this._eventsPrefix}.${event}` as EventEmitter.EventNames<EventTypes>
    }

    return event
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
  private addEventToEmitQueue(
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
  private getEventHandlerTransformCacheKey(
    event: EventEmitter.EventNames<EventTypes>
  ) {
    return this._getNamespacedEvent(event)
  }

  /** @internal */
  private runAndCacheEventHandlerTransform({
    event,
    transform,
    payload,
  }: {
    event: EventEmitter.EventNames<EventTypes>
    transform: EventTransform
    payload: unknown
  }): BaseComponent<EventTypes> {
    const transformCacheKey = this.getEventHandlerTransformCacheKey(event)
    if (!this._eventsTransformsCache.has(transformCacheKey)) {
      const instance = transform.instanceFactory(payload)
      this._eventsTransformsCache.set(transformCacheKey, instance)

      return instance
    }

    // @ts-ignore
    return this._eventsTransformsCache.get(transformCacheKey)
  }

  /** @internal */
  private cleanupEventHandlerTransformCache({
    event,
    force,
  }: {
    event: EventEmitter.EventNames<EventTypes>
    force: boolean
  }) {
    const transformCacheKey = this.getEventHandlerTransformCacheKey(event)
    const namespacedEvent = this._getNamespacedEvent(event)
    const instance = this._eventsTransformsCache.get(transformCacheKey)
    const eventCount = this.listenerCount(namespacedEvent)

    if (instance && (force || eventCount <= 1)) {
      instance.destroy()
      return this._eventsTransformsCache.delete(transformCacheKey)
    }

    logger.debug(
      `[cleanupEventHandlerTransformCache] Key wasn't cached`,
      transformCacheKey
    )
    return false
  }

  /**
   * Transforms are mapped using the "prefixed" event name (i.e
   * non-namespaced sent by the server with the _eventPrefix) and
   * then mapped again using the end-user `fn` reference.
   * @internal
   */
  private getEmitterListenersMapByEventName(
    event: EventEmitter.EventNames<EventTypes>
  ) {
    return (
      this._emitterListenersCache.get(event) ??
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
    event: EventEmitter.EventNames<EventTypes>,
    fn?: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    const cacheByEventName = this.getEmitterListenersMapByEventName(event)
    if (fn && cacheByEventName.has(fn)) {
      const handler = cacheByEventName.get(fn)
      cacheByEventName.delete(fn)
      this._emitterListenersCache.set(event, cacheByEventName)
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
  private createStableEventHandler(
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    const wrapperHandler = (payload: unknown) => {
      // FIXME: review how we're passing events from the on/once/off methods
      const internalNotNamespacedEvent = toInternalEventName({ event })
      const transform = this._emitterTransforms.get(internalNotNamespacedEvent)
      if (!transform) {
        // @ts-expect-error
        return fn(payload)
      }

      const cachedInstance = this.runAndCacheEventHandlerTransform({
        event,
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
    event: EventEmitter.EventNames<EventTypes>,
    fn: EventEmitter.EventListener<
      EventTypes,
      EventEmitter.EventNames<EventTypes>
    >
  ) {
    /**
     * Transforms are mapped using the "raw" event name (i.e
     * non-namespaced sent by the server)
     */
    const cacheByEventName = this.getEmitterListenersMapByEventName(event)
    let handler = cacheByEventName.get(fn)

    if (!handler) {
      handler = this.createStableEventHandler(event, fn)
      cacheByEventName.set(fn, handler)
      this._emitterListenersCache.set(event, cacheByEventName)
    }

    return handler
  }

  private trackEvent(event: EventEmitter.EventNames<EventTypes>) {
    this._trackedEvents = Array.from(new Set(this._trackedEvents.concat(event)))
  }

  private untrackEvent(event: EventEmitter.EventNames<EventTypes>) {
    this._trackedEvents = this._trackedEvents.filter((evt) => evt !== event)
  }

  private _getOptionsFromParams<T extends any[]>(params: T): typeof params {
    const [event, ...rest] = params

    return [
      this._getPrefixedEvent(event) as EventEmitter.EventNames<EventTypes>,
      ...rest,
    ] as T
  }

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type: 'on',
        params: [event, fn] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }

    // TODO: pick a better name for parsed*
    const [parsedEvent, parsedFn] = this._getOptionsFromParams([event, fn])
    const handler = this.getOrCreateStableEventHandler(
      parsedEvent,
      parsedFn as any
    )
    const internalEvent = this._getNamespacedEvent(parsedEvent)
    logger.trace('Registering event', internalEvent)
    this.trackEvent(parsedEvent)
    return this.emitter.on(internalEvent, handler)
  }

  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type: 'once',
        params: [event, fn] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }

    // TODO: pick a better name for parsed*
    const [parsedEvent, parsedFn] = this._getOptionsFromParams([event, fn])
    const handler = this.getOrCreateStableEventHandler(
      parsedEvent,
      parsedFn as any
    )
    const internalEvent = this._getNamespacedEvent(parsedEvent)
    logger.trace('Registering event', internalEvent)
    this.trackEvent(parsedEvent)
    return this.emitter.once(internalEvent, handler)
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

    // TODO: pick a better name for parsed*
    const [parsedEvent, parsedFn] = this._getOptionsFromParams([event, fn])
    const handler = this.getAndRemoveStableEventHandler(
      parsedEvent,
      parsedFn as any
    )
    const internalEvent = this._getNamespacedEvent(parsedEvent)
    this.cleanupEventHandlerTransformCache({
      event: parsedEvent,
      /**
       * If handler is not defined we'll force the cleanup
       * since the `emitter` will remove all the handlers
       * for the specified event
       */
      force: !handler,
    })
    logger.trace('Removing event listener', internalEvent)
    this.untrackEvent(parsedEvent)
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

    /**
     * Note that we're passing the non-namespaced event here.
     * `this.off` will take care of deriving the proper namespaced
     * event and handle transforms, etc.
     */
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
      this.addEventToEmitQueue(event, args)
      return false
    }

    const prefixedEvent = this._getPrefixedEvent(event)
    const namespacedEvent = this._getNamespacedEvent(prefixedEvent)
    logger.trace('Emit on event:', namespacedEvent)
    // @ts-ignore
    return this.emitter.emit(namespacedEvent, ...args)
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
            k as EventEmitter.EventNames<EventTypes>,
            handlersObj
          )
        )
      } else {
        this._emitterTransforms.set(
          key as EventEmitter.EventNames<EventTypes>,
          handlersObj
        )
      }
    })
  }
}
