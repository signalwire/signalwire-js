import type { Task } from '@redux-saga/types'
import {
  uuid,
  toInternalEventName,
  isLocalEvent,
  validateEventsToSubscribe,
  // instanceProxyFactory,
  getLogger,
} from './utils'
import { Action } from './redux'
import {
  ExecuteParams,
  ExecuteTransform,
  BaseComponentOptions,
  ExecuteExtendedOptions,
  // EventTransformType,
  // EventTransform,
  SDKWorker,
  SDKWorkerDefinition,
  SessionAuthStatus,
  SDKWorkerHooks,
  Authorization,
  SessionEvents,
} from './utils/interfaces'
import { EventEmitter } from './utils/EventEmitter'
import { SDKState } from './redux/interfaces'
import { makeCustomSagaAction } from './redux/actions'
import {
  OnlyStateProperties,
  EmitterContract,
  BaseComponentContract,
} from './types'
import {
  getAuthError,
  getAuthState,
  getAuthStatus,
} from './redux/features/session/sessionSelectors'
import { AuthError } from './CustomErrors'
// import { proxyFactory } from './utils/proxyUtils'
import { executeActionWorker } from './workers'

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

export const SW_SYMBOL = Symbol('BaseComponent')

export class BaseComponent<
  EventTypes extends EventEmitter.ValidEventTypes,
  StateProperties = Record<string, unknown>
> implements EmitterContract<EventTypes>, BaseComponentContract
{
  /** @internal */
  public __sw_symbol = SW_SYMBOL

  /** @internal */
  private readonly uuid = uuid()

  /** @internal */
  // private _proxyFactoryCache = new WeakMap<any, any>()

  /** @internal */
  get __uuid() {
    return this.uuid
  }

  private _eventsRegisterQueue = new Set<EventRegisterHandlers<EventTypes>>()
  private _eventsEmitQueue = new Set<any>()
  private _eventsNamespace?: string
  private _customSagaTriggers = new Map()
  private _destroyer?: () => void
  // TODO: change variable name
  private baseEventEmitter: EventEmitter<EventTypes>

  /**
   * A Namespace let us scope specific instances inside of a
   * particular product (like 'video.', 'chat.', etc.). For instance,
   * when working with a room, the namespace will let us send messages
   * to that specific room.
   */
  private _getNamespacedEvent(event: EventEmitter.EventNames<EventTypes>) {
    /**
     * "Remote" events are the events controlled by the
     * server. In order to be able to attach them we have to
     * wait for the server to respond.
     * `this._eventsNamespace` is usually set with some
     * piece of data coming from the server.
     */
    let namespace = this._eventsNamespace

    /**
     * "Local" events are attached synchronously so in order
     * to be able to namespaced them properly we must make
     * use of our locally generated __uuid.
     */
    if (typeof event === 'string' && isLocalEvent(event)) {
      namespace = this.__uuid
    }

    return toInternalEventName({
      event,
      namespace,
    })
  }

  private _getInternalEvent(event: EventEmitter.EventNames<EventTypes>) {
    return this._getNamespacedEvent(event)
  }

  /**
   * List of events being registered through the EventEmitter
   * instance. These events include the `_eventsPrefix` but not the
   * `_eventsNamespace`
   */
  private _trackedEvents: Array<EventEmitter.EventNames<EventTypes>> = []

  /**
   * List of running Tasks to be cancelled on `destroy`.
   */
  private _runningWorkers: Task[] = []

  protected get logger() {
    return getLogger()
  }

  /**
   * Map of Sagas that will be attached to the Store to
   * handle events or perform side-effects. This Map will
   * behave as a queue and will be emptied once the workers
   * have been attached. See `this.attachWorkers` for
   * details.
   */
  protected _workers: Map<string, { worker: SDKWorker<any> }> = new Map()

  constructor(public options: BaseComponentOptions<EventTypes>) {
    this.baseEventEmitter = new EventEmitter()
  }

  /** @internal */
  set destroyer(d: () => void) {
    this._destroyer = d
  }

  /** @internal */
  get store() {
    return this.options.store
  }

  /** @internal */
  get instanceMap() {
    return this.options.store.instanceMap
  }

  /** @internal */
  // TODO: Remove this
  get emitter() {
    return this.options.emitter
  }

  /** @internal */
  get baseEmitter() {
    return this.baseEventEmitter
  }

  /** @internal */
  get sessionEmitter() {
    return this.options.store.sessionEmitter
  }

  get session() {
    return {
      emit: (event: SessionEvents, payload: any) => {
        this.sessionEmitter.emit(event, payload)
      },
      on: (event: SessionEvents, fn: any) => {
        this.sessionEmitter.on(event, fn)
      },
      once: (event: SessionEvents, fn: any) => {
        this.sessionEmitter.once(event, fn)
      },
      off: (event: SessionEvents, fn: any) => {
        this.sessionEmitter.off(event, fn)
      },
    }
  }

  /** @internal */
  private addEventToRegisterQueue(options: EventRegisterHandlers<EventTypes>) {
    const [event, fn] = options.params
    this.logger.trace('Adding event to the register queue', { event, fn })
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
    this.logger.trace('Adding to the emit queue', event)
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

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.on(event, fn)
  }

  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.once(event, fn)
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.off(event, fn)
  }

  _on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.on(event, fn)
  }

  _once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.once(event, fn)
  }

  _off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.baseEmitter.off(event, fn)
  }

  removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(event?: T) {
    this.baseEventNames().forEach((eventName) => {
      this._off(eventName)
    })

    this.sessionEventNames().forEach((eventName) => {
      this.sessionEmitter.off(eventName)
    })

    if (this.shouldAddToQueue()) {
      this.addEventToRegisterQueue({
        type: 'removeAllListeners',
        params: [event] as any,
      })
      return this.emitter as EventEmitter<EventTypes>
    }

    if (event) {
      return this._off(event)
    }

    this.eventNames().forEach((eventName) => {
      this._off(eventName)
    })

    return this.emitter as EventEmitter<EventTypes>
  }

  /** @internal */
  eventNames() {
    return this._trackedEvents
  }

  /** @internal */
  baseEventNames() {
    return this.baseEmitter.eventNames()
  }

  /** @internal */
  sessionEventNames() {
    return this.sessionEmitter.eventNames()
  }

  protected getSubscriptions() {
    return validateEventsToSubscribe(
      this.eventNames().concat(this.baseEventNames())
    )
  }

  /** @internal */
  emit(event: EventEmitter.EventNames<EventTypes>, ...args: any[]) {
    if (this.shouldAddToQueue()) {
      this._addEventToEmitQueue(event, args)
      return false
    }

    const internalEvent = this._getInternalEvent(event)
    this.logger.trace('Emit on event:', internalEvent)
    // @ts-ignore
    return this.emitter.emit(internalEvent, ...args)
  }

  /** @internal */
  listenerCount<T extends EventEmitter.EventNames<EventTypes>>(event: T) {
    return (
      this.emitter.listenerCount(event) || this.baseEmitter.listenerCount(event)
    )
  }

  destroy() {
    this._destroyer?.()
    this.removeAllListeners()
    this.detachWorkers()
  }

  /** @internal */
  execute<
    InputType = unknown,
    OutputType = unknown,
    ParamsType = Record<string, any>
  >(
    { method, params }: ExecuteParams,
    {
      transformParams = identity,
      transformResolve = identity,
      transformReject = identity,
    }: ExecuteExtendedOptions<InputType, OutputType, ParamsType> = {
      transformParams: identity,
      transformResolve: identity,
      transformReject: identity,
    }
  ) {
    return new Promise<OutputType>((resolve, reject) => {
      const requestId = uuid()

      this.runWorker('executeActionWorker', {
        worker: executeActionWorker,
        onDone: (data) => resolve(transformResolve(data)),
        onFail: (error) => reject(transformReject(error)),
        initialState: {
          requestId,
          componentId: this.__uuid,
          method,
          params: transformParams(params as ParamsType),
        },
      })
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

  /** @internal */
  protected getCompoundEvents(): Map<
    EventEmitter.EventNames<EventTypes>,
    EventEmitter.EventNames<EventTypes>[]
  > {
    return new Map()
  }

  /** @internal */
  protected get _sessionAuthStatus(): SessionAuthStatus {
    return getAuthStatus(this.store.getState())
  }

  /** @internal */
  protected get _sessionAuthState(): Authorization | undefined {
    return getAuthState(this.store.getState())
  }

  /** @internal */
  protected _waitUntilSessionAuthorized(): Promise<this> {
    const authStatus = getAuthStatus(this.store.getState())

    switch (authStatus) {
      case 'authorized':
        return Promise.resolve(this)

      /**
       * `unknown` is the initial state of the auth reducer
       * so if we've got this far it means it's the first
       * time the user is calling `connect`.
       */
      case 'unknown':
      /**
       * `authorizing` means that the user is calling
       * `connect` again while we're in the process of
       * authorizing the session.
       */
      case 'authorizing':
        return new Promise((resolve, reject) => {
          const unsubscribe = this.store.subscribe(() => {
            const authStatus = getAuthStatus(this.store.getState())
            const authError = getAuthError(this.store.getState())

            if (authStatus === 'authorized') {
              resolve(this)
              unsubscribe()
            } else if (authStatus === 'unauthorized') {
              const error = authError
                ? new AuthError(authError.code, authError.message)
                : new Error('Unauthorized')
              reject(error)
              unsubscribe()
            }
          })
        })

      case 'unauthorized':
        return Promise.reject(new Error('Unauthorized'))
    }
  }

  /** @internal */
  public runWorker<Hooks extends SDKWorkerHooks = SDKWorkerHooks>(
    name: string,
    def: SDKWorkerDefinition<Hooks>
  ) {
    if (this._workers.has(name)) {
      getLogger().warn(
        `[runWorker] Worker with name ${name} has already been registerd.`
      )
    } else {
      this._setWorker(name, def)
    }

    return this._attachWorker(name, def)
  }

  private _setWorker<Hooks extends SDKWorkerHooks = SDKWorkerHooks>(
    name: string,
    def: SDKWorkerDefinition<Hooks>
  ) {
    this._workers.set(name, def)
  }

  private _attachWorker<Hooks extends SDKWorkerHooks = SDKWorkerHooks>(
    name: string,
    { worker, ...params }: SDKWorkerDefinition<Hooks>
  ) {
    const task = this.store.runSaga(worker, {
      instance: this,
      runSaga: this.store.runSaga,
      ...params,
    })
    this._runningWorkers.push(task)
    /**
     * Attaching workers is a one-time op for instances so
     * the moment we attach one we'll remove it from the
     * queue.
     */
    this._workers.delete(name)
    return task
  }

  private detachWorkers() {
    this._runningWorkers.forEach((task) => {
      task.cancel()
    })
    this._runningWorkers = []
  }
}
