import StrictEventEmitter from 'strict-event-emitter-types'
import {
  BaseClient,
  SessionState,
  GlobalVideoEvents,
  connect,
  EventsPrefix,
} from '@signalwire/core'
import { Video } from './Video'
import { RealTimeVideoApiEvents } from './types/video'

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
    const video = connect({
      store: this.store,
      Component: Video,
      componentListeners: {
        errors: 'onError',
        responses: 'onSuccess',
      },
    })({
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
