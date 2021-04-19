import { initSessionAction, destroySessionAction } from './redux'
import { Emitter } from './utils/interfaces'
export class SignalWire implements Emitter<SignalWire> {
  constructor(public options: any, public store: any) {}

  on = this.options.emitter.on
  off = this.options.emitter.off
  once = this.options.emitter.once
  removeAllListeners = this.options.emitter.removeAllListeners
  emit = this.options.emitter.emit

  connect() {
    this.store.dispatch(initSessionAction())
  }

  disconnect() {
    this.store.dispatch(destroySessionAction())
  }

  // get rooms() {
  //   return {
  //     create(options) {
  //       return connect({
  //         store: this.store,
  //         componentConstructor: BaseCall,
  //         onStateChangeListeners: {
  //           state: 'onStateChange',
  //           remoteSDP: 'onRemoteSDP',
  //         },
  //       })(options)
  //     },
  //   }
  // }
}
