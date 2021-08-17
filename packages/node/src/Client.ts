import StrictEventEmitter from 'strict-event-emitter-types'
import {
  BaseClient,
  SessionState,
  GlobalVideoEvents,
  connect,
} from '@signalwire/core'
import { Video } from './Video'
import { RelayVideoApiEvents } from './types/video'

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

  get video(): StrictEventEmitter<Video, RelayVideoApiEvents> {
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
      /**
       * Events at this level will always be global so there's no need
       * for a namespace.
       */
      namespace: '',
      eventChannel: 'video.rooms',
      store: this.store,
      emitter: this.options.emitter,
    })
    this._consumers.set('video', video)
    return video
  }
}
