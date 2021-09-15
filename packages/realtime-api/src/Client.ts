import {
  BaseClient,
  EventsPrefix,
  SessionState,
  ClientContract,
  ClientEvents,
  logger,
} from '@signalwire/core'
import { createVideoObject, Video } from './Video'

export interface RealtimeClient
  extends ClientContract<RealtimeClient, ClientEvents> {
  video: Video
}

type ClientNamespaces = Video

export class Client extends BaseClient<ClientEvents> {
  private _consumers: Map<EventsPrefix, ClientNamespaces> = new Map()

  async onAuth(session: SessionState) {
    try {
      if (session.authStatus === 'authorized') {
        this._consumers.forEach((consumer) => {
          consumer.subscribe()
        })
      }
    } catch (error) {
      logger.error('Client subscription failed.')
      this.disconnect()

      /**
       * TODO: This error is not being catched by us so it's
       * gonna appear as `UnhandledPromiseRejectionWarning`.
       * The reason we are re-throwing here is because if
       * this happens something serious happened and the app
       * won't work anymore since subscribes aren't working.
       */
      throw error
    }
  }

  get video(): Video {
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
