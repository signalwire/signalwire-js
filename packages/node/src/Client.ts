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

type ClientNamespaces = 'video'

export class Client extends BaseClient {
  private _consumers: Map<ClientNamespaces, Consumer> = new Map()

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._consumers.forEach((consumer) => {
        consumer.run()
      })
    }
  }

  get video(): Video {
    if (this._consumers.has('video')) {
      return this._consumers.get('video') as Video
    }
    const video = connect({
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
    this._consumers.set('video', video)
    return video
  }
}
