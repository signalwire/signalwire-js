import {
  EventTransform,
  InternalVideoRoomEventNames,
  RoomCustomMethods,
  toExternalJSON,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { createRoomSessionObject } from './video/RoomSession'

type TransformEvent = Extract<
  InternalVideoRoomEventNames,
  'video.room.started' | 'video.room.ended'
>

class Video extends BaseConsumer {
  /** @internal */
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<TransformEvent | TransformEvent[], EventTransform>([
      [
        ['video.room.started', 'video.room.ended'],
        {
          instanceFactory: () => {
            return createRoomSessionObject({
              store: this.store,
              emitter: this.options.emitter,
            })
          },
          payloadTransform: (payload: any) => {
            return toExternalJSON(payload.room)
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
