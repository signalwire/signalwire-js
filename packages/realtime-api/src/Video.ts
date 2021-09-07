import {
  BaseComponentOptions,
  connect,
  EventTransform,
  InternalVideoRoomEventNames,
  toExternalJSON,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { createRoomSessionObject } from './video/RoomSession'

type TransformEvent = Extract<
  InternalVideoRoomEventNames,
  'video.room.started' | 'video.room.ended'
>

export class Video extends BaseConsumer {
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

export const createVideoObject = (params: BaseComponentOptions) => {
  const video = connect({
    store: params.store,
    Component: Video,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return video
}
