import { initSessionAction, destroySessionAction } from './redux'

export class SignalWire {
  constructor(public options: any, public store: any) {}

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
