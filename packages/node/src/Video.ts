import { RoomCustomMethods, connect, InternalRoomEvent } from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Room } from './Room'

// TODO: Replace with proper payload for each event
type Payload = {
  room_id: string
  room: any
}

class Video extends BaseConsumer {
  /** @internal */
  protected _eventsPrefix = 'video' as const
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

  protected getEmitterTransforms() {
    return new Map<
      InternalRoomEvent | InternalRoomEvent[],
      {
        instanceFactory: (instance: Room) => void
        payloadTransform: (payload: Payload) => void
      }
    >([
      [
        'video.room.started',
        {
          instanceFactory: (instance) => {},
          payloadTransform: (payload) => {},
        },
      ],
      [
        'video.room.subscribed',
        {
          instanceFactory: (instance) => {},
          payloadTransform: (payload) => {},
        },
      ],
      [
        ['video.room.ended', 'video.room.updated'],
        {
          instanceFactory: (instance) => {},
          payloadTransform: (payload) => {},
        },
      ],
    ])
  }
}

const customMethods: RoomCustomMethods<any> = {
  // TODO: add methods
}
Object.defineProperties(Video.prototype, customMethods)

export { Video }
