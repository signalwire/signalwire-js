import { RoomCustomMethods, connect } from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Room } from './Room'

// TODO: add events
type VideoEvents = any

class Video extends BaseConsumer<VideoEvents> {
  subscribeParams = {
    get_initial_state: true,
  }

  protected _emitterTransforms = new Map<any, any>([
    [
      'video.room.started',
      (handler: any) => (payload: any) => {
        const room: Room = connect({
          store: this.store,
          Component: Room,
          componentListeners: {
            errors: 'onError',
            responses: 'onSuccess',
          },
        })({
          name: payload.room.name,
          id: payload.room.room_id,
          namespace: payload.room.room_session_id,
          eventChannel: payload.room.event_channel,
          store: this.store,
          emitter: this.options.emitter,
        })

        return handler(room)
      },
    ],
  ])
}

const customMethods: RoomCustomMethods<any> = {
  // TODO: add methods
}
Object.defineProperties(Video.prototype, customMethods)

export { Video }
