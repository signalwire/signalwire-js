import { uuid } from './utils'

export class BaseComponent {
  id = uuid()
  _requests = new Map()

  constructor(public options: any) {}

  get store() {
    return this.options.store
  }

  execute(msg: any) {
    return new Promise((resolve, reject) => {
      this._requests.set(msg.id, { resolve, reject })

      this.store.dispatch({
        type: 'WEBRTC',
        payload: {
          componentId: this.id,
          jsonrpc: msg,
        },
      })
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
