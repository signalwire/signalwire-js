import {
  BaseClient,
  SessionState,
  GlobalVideoEvents,
  connect,
} from '@signalwire/core'
import { Video } from './Video'

interface Consumer {
  on: (event: GlobalVideoEvents, handler: any) => void
  run: () => Promise<unknown>
}

export class Client extends BaseClient {
  private _consumers: Consumer[] = []

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized' && session.authCount > 1) {
      this._consumers.forEach((consumer) => {
        consumer.run()
      })
    }
  }

  get video() {
    return connect({
      store: this.store,
      Component: Video,
      componentListeners: {
        errors: 'onError',
        responses: 'onSuccess',
      },
    })({
      namespace: '',
      eventChannel: 'rooms',
      store: this.store,
      emitter: this.options.emitter,
    })
  }
}
