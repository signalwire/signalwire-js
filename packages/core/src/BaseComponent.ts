import type { Task } from '@redux-saga/types'
import { uuid, validateEventsToSubscribe, getLogger } from './utils'
import { Action } from './redux'
import {
  ExecuteParams,
  ExecuteTransform,
  BaseComponentOptions,
  ExecuteExtendedOptions,
  SDKWorker,
  SDKWorkerDefinition,
  SessionAuthStatus,
  SDKWorkerHooks,
  Authorization,
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
  getAuthorization,
  getAuthStatus,
} from './redux/features/session/sessionSelectors'
import { AuthError } from './CustomErrors'
import { executeActionWorker } from './workers'

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
  get __uuid() {
    return this.uuid
  }

  private _customSagaTriggers = new Map()
  private _destroyer?: () => void
  private eventEmitter: EventEmitter<EventTypes>

  /**
   * List of running Tasks to be cancelled on `destroy`.
   */
  private _runningWorkers: Task[] = []

  public get logger() {
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

  constructor(public options: BaseComponentOptions) {
    this.eventEmitter = new EventEmitter<EventTypes>()
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
    return this.store.instanceMap
  }

  /** @internal */
  get emitter() {
    return this.eventEmitter
  }

  /** @internal */
  get sessionEmitter() {
    return this.store.sessionEmitter
  }

  /** @internal */
  get session() {
    return this.sessionEmitter
  }

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.on(event, fn)
  }

  once<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.once(event, fn)
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>
  ) {
    return this.emitter.off(event, fn)
  }

  removeAllListeners<T extends EventEmitter.EventNames<EventTypes>>(event?: T) {
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
    return this.emitter.eventNames()
  }

  /** @internal */
  sessionEventNames() {
    return this.sessionEmitter.eventNames()
  }

  protected getSubscriptions() {
    return validateEventsToSubscribe(this.eventNames())
  }

  /** @internal */
  emit<E extends EventEmitter.EventNames<EventTypes>>(
    event: E,
    ...args: EventEmitter.EventArgs<EventTypes, E>
  ) {
    return this.emitter.emit(event, ...args)
  }

  /** @internal */
  listenerCount<T extends EventEmitter.EventNames<EventTypes>>(event: T) {
    return this.emitter.listenerCount(event)
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
  protected get _sessionAuthStatus(): SessionAuthStatus {
    return this.select(getAuthStatus)
  }

  /** @internal */
  protected get _sessionAuthorization(): Authorization | undefined {
    return this.select(getAuthorization)
  }

  /** @internal */
  protected _waitUntilSessionAuthorized(): Promise<this> {
    const authStatus = this._sessionAuthStatus

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
            const authStatus = this.select(getAuthStatus)
            const authError = this.select(getAuthError)

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

  public cancelWorker(workerTask: Task) {
    const foundTaskIndex = this._runningWorkers.findIndex(
      (task) => task === workerTask
    )
    if (foundTaskIndex > -1) {
      this._runningWorkers.splice(foundTaskIndex, 1)
      workerTask.cancel()
    }
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
