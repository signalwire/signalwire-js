import {
  BaseClient,
  EventsPrefix,
  SessionState,
  Emitter,
  ClientEvents,
} from '@signalwire/core'
import { createVideoObject, Video } from './Video'

export interface RealtimeClient extends Emitter<ClientEvents> {
  video: Video
}

type ClientNamespaces = Video

export class Client extends BaseClient<ClientEvents> {
  private _consumers: Map<EventsPrefix, ClientNamespaces> = new Map()

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
    const video = createVideoObject({
      store: this.store,
      // Emitter is now typed but we share it across objects
      // so types won't match
      // @ts-expect-error
      emitter: this.options.emitter,
    })
    this._consumers.set('video', video)
    return video
  }
}
