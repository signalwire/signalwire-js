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
    // TODO: Define pattern for this (creating Proxies)
    const proxiedObj = new Proxy(video, {
      get(target: any, prop: any, receiver: any) {
        if (prop === '_eventsNamespace') {
          /**
           * Events at this level will always be global so
           * there's no need for a namespace.
           */
          return ''
        } else if (prop === 'eventChannel') {
          return 'video.rooms'
        }

        return Reflect.get(target, prop, receiver)
      },
    })
    this._consumers.set('video', proxiedObj)
    return proxiedObj
  }
}
