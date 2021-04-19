import { uuid } from './utils'
import { executeAction } from './redux'
import { Emitter } from './utils/interfaces'

export class BaseComponent implements Emitter {
  id = uuid()

  private _requests = new Map()
  private _destroyer?: () => void

  constructor(public options: any) {}

  // TODO: make sure emitter is defined here
  on = this.options.emitter.on
  off = this.options.emitter.off
  once = this.options.emitter.once
  removeAllListeners = this.options.emitter.removeAllListeners
  emit = this.options.emitter.emit

  set destroyer(d: () => void) {
    this._destroyer = d
  }

  get store() {
    return this.options.store
  }

  destroy() {
    this._destroyer?.()
  }

  execute(msg: any) {
    return new Promise((resolve, reject) => {
      this._requests.set(msg.id, { resolve, reject })

      this.store.dispatch(
        executeAction({
          componentId: this.id,
          jsonrpc: msg,
        })
      )
    })
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
