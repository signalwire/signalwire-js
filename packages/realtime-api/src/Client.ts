import {
  BaseClient,
  EventsPrefix,
  SessionState,
  ClientContract,
  ClientEvents,
} from '@signalwire/core'
import { createVideoObject, VideoObject } from './Video'

export interface RealtimeClient
  extends ClientContract<RealtimeClient, ClientEvents> {
  video: VideoObject
}

type ClientNamespaces = VideoObject

export class Client extends BaseClient<ClientEvents> {
  private _consumers: Map<EventsPrefix, ClientNamespaces> = new Map()

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._consumers.forEach((consumer) => {
        consumer.run()
      })
    }
  }

  get video(): VideoObject {
    if (this._consumers.has('video')) {
      return this._consumers.get('video')!
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
