import {
  BaseComponentOptions,
  connect,
  EventTransform,
  InternalVideoRoomSessionEventNames,
  toExternalJSON,
  ConsumerContract,
  RoomSessionRecording,
  VideoRoomEventParams,
} from '@signalwire/core'
import { BaseConsumer } from '../BaseConsumer'
import { RealTimeVideoApiEvents } from '../types/video'
import { createRoomSessionObject, RoomSession } from './RoomSession'
import type { RoomSessionMember } from './RoomSessionMember'

type TransformEvent = Extract<
  InternalVideoRoomSessionEventNames,
  'video.room.started' | 'video.room.ended'
>

/**
 * Access the Video API Consumer. You can use an instance of the Video class
 * (you can obtain one via {@link createClient}) to subscribe to the
 * following events:
 * 
 * **room.started**  
 * Emitted when a room session is started. Your event handler
 * receives an object which is an instance of {@link RoomSession}. Example:
 * ```typescript
 * const client = await createClient(...)
 * client.video.on('room.started', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * ```
 * 
 * **room.ended**  
 * Emitted when a room session ends. Your event handler receives
 * an object which is an instance of {@link RoomSession}.
 * ```typescript
 * const client = await createClient(...)
 * client.video.on('room.ended', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * ```
 */
export interface Video extends ConsumerContract<RealTimeVideoApiEvents> {}
export type { RoomSession, RoomSessionMember, RoomSessionRecording }

/** @internal */
export class VideoAPI extends BaseConsumer<RealTimeVideoApiEvents> {
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
          payloadTransform: (payload: VideoRoomEventParams) => {
            return toExternalJSON({
              ...payload.room_session,
              room_session_id: payload.room_session.id,
            })
          },
          getInstanceEventNamespace: (payload: VideoRoomEventParams) => {
            return payload.room_session.id
          },
          getInstanceEventChannel: (payload: VideoRoomEventParams) => {
            return payload.room_session.event_channel
          },
        },
      ],
    ])
  }
}

/** @internal */
export const createVideoObject = (
  params: BaseComponentOptions<RealTimeVideoApiEvents>
): Video => {
  const video = connect<RealTimeVideoApiEvents, VideoAPI, Video>({
    store: params.store,
    Component: VideoAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  const proxy = new Proxy<Video>(video, {
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
