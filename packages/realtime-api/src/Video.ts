import {
  RoomCustomMethods,
  connect,
  toExternalJSON,
  InternalRoomEvent,
  EventTransform,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { Room } from './Room'

class Video extends BaseConsumer {
  /** @internal */
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<InternalRoomEvent | InternalRoomEvent[], EventTransform>([
      [
        // TODO: Move to a const
        [
          'video.room.started',
          'video.room.updated',
          'video.room.subscribed',
          'video.room.ended',
        ],
        {
          instanceFactory: (payload: any) => {
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

            return room
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON(payload)
          },
          getInstanceEventNamespace: (payload: any) => {
            return payload.room_session_id
          },
          getInstanceEventChannel: (payload: any) => {
            return payload.room.event_channel
          },
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
