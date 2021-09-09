import {
  BaseClient,
  EventsPrefix,
  SessionState,
  Emitter,
  ClientEvents,
} from '@signalwire/core'
import { createVideoObject, Video } from './Video'

// interface Consumer {
//   on: (event: GlobalVideoEvents, handler: any) => void
//   run: () => Promise<unknown>
// }

export interface RealtimeClient extends Emitter<ClientEvents> {
  video: Video
}

export class Client extends BaseClient<{}> {
  private _consumers: Map<EventsPrefix, any> = new Map()

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
      // TODO:
      emitter: this.options.emitter as any,
    })
    this._consumers.set('video', video)
    return video
  }
}
