import {
  BaseComponentOptions,
  BaseConsumer,
  connect,
  EventTransform,
  InternalVideoRoomSessionEventNames,
  toExternalJSON,
  ConsumerContract,
  RoomSessionRecording,
  VideoRoomEventParams,
  RoomSessionPlayback,
} from '@signalwire/core'
import type { RealtimeClient } from '../client/Client'

import { RealTimeVideoApiEvents } from '../types/video'
import {
  createRoomSessionObject,
  RoomSession,
  RoomSessionFullState,
} from './RoomSession'
import type { RoomSessionMember } from './RoomSessionMember'

type TransformEvent = Extract<
  InternalVideoRoomSessionEventNames,
  'video.room.started' | 'video.room.ended'
>

/**
 * Access the Video API Consumer. You can use an instance of the Video class
 * (you can obtain one via {@link createClient}) to subscribe to the Video
 * events.
 *
 * ### Example
 *
 * The following example logs whenever a room session is started or a user joins
 * it:
 *
 * ```javascript
 * // Obtain a client:
 * const client = await createClient({ project, token })
 *
 * // Listen for events:
 * client.video.on('room.started', async (roomSession) => {
 *   console.log('Room has started:', roomSession.name)
 *
 *   roomSession.on('member.joined', async (member) => {
 *     console.log('Member joined:', member.name)
 *   })
 *
 *   await roomSession.subscribe()
 * })
 *
 * // Connect the client:
 * await client.connect()
 * ```
 *
 * ### Events
 * You can use this object to subscribe to the following events.
 *
 *  - **room.started**:
 *
 * Emitted when a room session is started. Your event handler receives an object
 * which is an instance of {@link RoomSession}. Example:
 * ```typescript
 * const client = await createClient(...)
 * client.video.on('room.started', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * await client.connect()
 * ```
 *
 *  - **room.ended**:
 *
 * Emitted when a room session ends. Your event handler receives an object which
 * is an instance of {@link RoomSession}.
 * ```typescript
 * const client = await createClient(...)
 * client.video.on('room.ended', async (roomSession) => {
 *     console.log(roomSession.name)
 * })
 * await client.connect()
 * ```
 */
export interface Video extends ConsumerContract<RealTimeVideoApiEvents> {
  /** @internal */
  subscribe(): Promise<void>
  /** @internal */
  _session: RealtimeClient
}
export type {
  RoomSession,
  RoomSessionFullState,
  RoomSessionMember,
  RoomSessionRecording,
  RoomSessionPlayback,
}

/** @internal */
class VideoAPI extends BaseConsumer<RealTimeVideoApiEvents> {
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
          // TODO: create a new key or use `roomSession`?
          type: 'roomSession',
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

export * from './VideoClient'
