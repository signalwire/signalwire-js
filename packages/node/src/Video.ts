import { RoomCustomMethods, connect } from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Room } from './Room'

class Video extends BaseConsumer {
  /** @internal */
  protected _eventsPrefix = 'video.' as const
  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }
  /** @internal */
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
