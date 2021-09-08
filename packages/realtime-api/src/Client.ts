import {
  BaseClient,
  EventsPrefix,
  GlobalVideoEvents,
  SessionState,
} from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
import { RealTimeVideoApiEvents } from './types/video'
import { createVideoObject, Video } from './Video'

interface Consumer {
  on: (event: GlobalVideoEvents, handler: any) => void
  run: () => Promise<unknown>
}

export class Client extends BaseClient {
  private _consumers: Map<EventsPrefix, Consumer> = new Map()

  async onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._consumers.forEach((consumer) => {
        consumer.run()
      })
    }
  }

  get video(): StrictEventEmitter<Video, RealTimeVideoApiEvents> {
    if (this._consumers.has('video')) {
      return this._consumers.get('video') as Video
    }
    const video = createVideoObject({
      store: this.store,
      emitter: this.options.emitter,
    })
    this._consumers.set('video', video)
    return video
  }
}
