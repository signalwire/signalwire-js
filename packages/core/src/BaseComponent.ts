import { uuid } from './utils'
import { executeAction } from './redux'
import { BladeExecuteMethod, Emitter } from './utils/interfaces'
import { SDKState } from './redux/interfaces'
import { BaseComponentOptions } from './utils/interfaces'

type ExecuteParams = {
  method: BladeExecuteMethod
  params: Record<string, any>
}

export class BaseComponent implements Emitter {
  id = uuid()

  private _requests = new Map()
  private _destroyer?: () => void

  constructor(public options: BaseComponentOptions) {}

  set destroyer(d: () => void) {
    this._destroyer = d
  }

  get store() {
    return this.options.store
  }

  get emitter() {
    return this.options.emitter
  }

  on(...params: Parameters<Emitter['on']>) {
    return this.emitter.on(...params)
  }

  once(...params: Parameters<Emitter['once']>) {
    return this.emitter.once(...params)
  }

  off(...params: Parameters<Emitter['off']>) {
    return this.emitter.off(...params)
  }

  emit(...params: Parameters<Emitter['emit']>) {
    return this.emitter.emit(...params)
  }

  removeAllListeners(...params: Parameters<Emitter['removeAllListeners']>) {
    return this.emitter.removeAllListeners(...params)
  }

  destroy() {
    this._destroyer?.()
    this.removeAllListeners()
  }

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

  select<T>(selectorFn: (state: SDKState) => T) {
    return selectorFn(this.store.getState())
  }

  onError(component: any) {
    this._requests.forEach((value, key) => {
      value.reject(component.errors[key])
      this._requests.delete(key)
    })
  }

  onSuccess(component: any) {
    this._requests.forEach((value, key) => {
      value.resolve(component.responses[key])
      this._requests.delete(key)
    })
  }
}
