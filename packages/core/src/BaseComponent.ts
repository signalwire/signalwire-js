import { uuid } from './utils'
import { executeAction } from './redux'
import {
  ExecuteParams,
  BaseComponentOptions,
  Emitter,
} from './utils/interfaces'
import { getNamespacedEvent } from './utils/EventEmitter'
import { SDKState } from './redux/interfaces'

export class BaseComponent implements Emitter {
  id = uuid()

  private _requests = new Map()
  private _destroyer?: () => void
  private _getNamespacedEvent(event: string | symbol) {
    if (event && typeof event === 'string') {
      return getNamespacedEvent({
        namespace: this.id,
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

  on(event: string | symbol, fn: (...args: any[]) => void, context?: any) {
    return this.emitter.on(this._getNamespacedEvent(event), fn, context)
  }

  once(event: string | symbol, fn: (...args: any[]) => void, context?: any) {
    return this.emitter.once(this._getNamespacedEvent(event), fn, context)
  }

  off(
    event: string | symbol,
    fn?: ((...args: any[]) => void) | undefined,
    context?: any,
    once?: boolean | undefined
  ) {
    return this.emitter.off(this._getNamespacedEvent(event), fn, context, once)
  }

  emit(event: string | symbol, ...args: any[]) {
    return this.emitter.emit(this._getNamespacedEvent(event), ...args)
  }

  removeAllListeners(event?: string | symbol | undefined) {
    return this.emitter.removeAllListeners(
      event ? this._getNamespacedEvent(event) : event
    )
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
}
