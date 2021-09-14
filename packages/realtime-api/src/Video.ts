import {
  BaseComponentOptions,
  connect,
  EventTransform,
  InternalVideoRoomSessionEventNames,
  toExternalJSON,
  ConsumerContract,
} from '@signalwire/core'
import { BaseConsumer } from './BaseConsumer'
import { RealTimeVideoApiEvents } from './types/video'
import { createRoomSessionObject } from './video/RoomSession'

type TransformEvent = Extract<
  InternalVideoRoomSessionEventNames,
  'video.room.started' | 'video.room.ended'
>

export interface VideoObject extends ConsumerContract<RealTimeVideoApiEvents> {}

export class Video extends BaseConsumer<RealTimeVideoApiEvents> {
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
              // Emitter is now typed.
              // @ts-expect-error
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

export const createVideoObject = (
  params: BaseComponentOptions<RealTimeVideoApiEvents>
): VideoObject => {
  const video = connect<RealTimeVideoApiEvents, Video, VideoObject>({
    store: params.store,
    Component: Video,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  const proxy = new Proxy<VideoObject>(video, {
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

  return proxy
}
