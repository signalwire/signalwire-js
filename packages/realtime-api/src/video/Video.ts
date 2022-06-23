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
  toLocalEvent,
} from '@signalwire/core'
import type { RealtimeClient } from '../client/Client'

import { RealTimeVideoApiEvents } from '../types/video'
import {
  createRoomSessionObject,
  RoomSession,
  RoomSessionFullState,
} from './RoomSession'
import type { RoomSessionMember } from './RoomSessionMember'

const videoRoomGetTriggerEvent = toLocalEvent<TransformEvent>('video.room.get')

type TransformEvent =
  | Extract<
      InternalVideoRoomSessionEventNames,
      'video.room.started' | 'video.room.ended'
    >
  | 'video.__local__.room.get'

export interface Video extends ConsumerContract<RealTimeVideoApiEvents> {
  /** @internal */
  subscribe(): Promise<void>
  /** @internal */
  _session: RealtimeClient

  getRoomSessionsInProgress(): Promise<any> // FIXME: any
  getRoomSession(params: { id: string }): Promise<any> // FIXME: any
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
        [videoRoomGetTriggerEvent, 'video.room.started', 'video.room.ended'],
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

  async getRoomSessionsInProgress() {
    return new Promise(async (resolve, reject) => {
      try {
        const { rooms = [] }: any = await this.execute({
          method: 'video.rooms.get',
          params: {},
        })
        const roomSessions: any[] = []
        const handler = (instance: any) => roomSessions.push(instance)

        // @ts-expect-error
        this.on(videoRoomGetTriggerEvent, handler)

        rooms.forEach((room_session: any) => {
          // @ts-expect-error
          this.emit(videoRoomGetTriggerEvent, { room_session })
        })

        // @ts-expect-error
        this.off(videoRoomGetTriggerEvent, handler)
        resolve({ roomSessions })
      } catch (error) {
        console.error('Error listing room sessions', error)
        reject(error)
      }
    })
  }

  async getRoomSession({ id }: { id: string }) {
    return new Promise(async (resolve, reject) => {
      try {
        const { room }: any = await this.execute({
          method: 'video.room.get',
          params: {
            room_session_id: id,
          },
        })

        // @ts-expect-error
        this.once(videoRoomGetTriggerEvent, (instance: any) => {
          resolve({ roomSession: instance })
        })

        // @ts-expect-error
        this.emit(videoRoomGetTriggerEvent, { room_session: room })
      } catch (error) {
        console.error('Error retrieving the room session', error)
        reject(error)
      }
    })
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
