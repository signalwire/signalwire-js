import {
  BaseComponentOptions,
  connect,
  EventTransform,
  InternalVideoRoomSessionEventNames,
  toExternalJSON,
  ConsumerContract,
  RoomSessionRecording,
  VideoRoomEventParams,
  RoomSessionPlayback,
  toLocalEvent,
  EventEmitter,
} from '@signalwire/core'
import { AutoSubscribeConsumer } from '../AutoSubscribeConsumer'
import type { RealtimeClient } from '../client/Client'

import {
  RealTimeRoomApiEvents,
  RealTimeVideoApiEvents,
  RealTimeVideoApiEventsHandlerMapping,
  RealTimeRoomApiEventsHandlerMapping,
} from '../types/video'
import {
  createRoomSessionObject,
  RoomSession,
  RoomSessionFullState,
  RoomSessionUpdated,
} from './RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from './RoomSessionMember'
import { videoCallingWorker } from './workers'

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
  /** @internal */
  baseEmitter: EventEmitter
  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void

  getRoomSessions(): Promise<{ roomSessions: RoomSession[] }>
  getRoomSessionById(id: string): Promise<{ roomSession: RoomSession }>
}
export type {
  RealTimeRoomApiEvents,
  RealTimeRoomApiEventsHandlerMapping,
  RealTimeVideoApiEvents,
  RealTimeVideoApiEventsHandlerMapping,
  RoomSession,
  RoomSessionFullState,
  RoomSessionMember,
  RoomSessionMemberUpdated,
  RoomSessionPlayback,
  RoomSessionRecording,
  RoomSessionUpdated,
}

export type {
  ClientEvents,
  EmitterContract,
  EntityUpdated,
  GlobalVideoEvents,
  InternalVideoMemberEntity,
  LayoutChanged,
  MEMBER_UPDATED_EVENTS,
  MemberCommandParams,
  MemberCommandWithValueParams,
  MemberCommandWithVolumeParams,
  MemberJoined,
  MemberLeft,
  MemberListUpdated,
  MemberTalking,
  MemberTalkingEnded,
  MemberTalkingEventNames,
  MemberTalkingStart,
  MemberTalkingStarted,
  MemberTalkingStop,
  MemberUpdated,
  MemberUpdatedEventNames,
  PlaybackEnded,
  PlaybackStarted,
  PlaybackUpdated,
  RecordingEnded,
  RecordingStarted,
  RecordingUpdated,
  RoomEnded,
  RoomStarted,
  RoomSubscribed,
  RoomUpdated,
  SipCodec,
  VideoLayoutEventNames,
  VideoMemberContract,
  VideoMemberEntity,
  VideoMemberEventNames,
  VideoMemberType,
  VideoPlaybackEventNames,
  VideoPosition,
  VideoRecordingEventNames,
} from '@signalwire/core'

/** @internal */
class VideoAPI extends AutoSubscribeConsumer<RealTimeVideoApiEvents> {
  constructor(options: BaseComponentOptions<RealTimeVideoApiEvents>) {
    super(options)

    this.runWorker('videoCallWorker', { worker: videoCallingWorker })
  }

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
          type: 'roomSession',
          mode: 'no-cache',
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

  async getRoomSessions() {
    return new Promise<{ roomSessions: RoomSession[] }>(
      async (resolve, reject) => {
        try {
          const { rooms = [] }: any = await this.execute({
            method: 'video.rooms.get',
            params: {},
          })

          const resolveHandler = (roomSessions: RoomSession[]) => {
            resolve({ roomSessions })
          }

          // @ts-expect-error
          this.once('room.sessions', resolveHandler)

          // Put the internal SDK event on SW channel to create a RoomSession instance
          this.store.putOnSwEventChannel({
            // @ts-expect-error
            type: 'video.sdk.room.sessions',
            payload: rooms,
          })
        } catch (error) {
          console.error('Error listing room sessions', error)
          reject(error)
        }
      }
    )
  }

  async getRoomSessionById(id: string) {
    return new Promise<{ roomSession: RoomSession }>(
      async (resolve, reject) => {
        try {
          const { room }: any = await this.execute({
            method: 'video.room.get',
            params: {
              room_session_id: id,
            },
          })

          const resolveHandler = (roomSession: RoomSession) => {
            resolve({ roomSession })
          }

          // @ts-expect-error
          this.once('room.session', resolveHandler)

          // Put the internal SDK event on SW channel to create or update a RoomSession instance
          this.store.putOnSwEventChannel({
            // @ts-expect-error
            type: 'video.sdk.room.session',
            payload: room,
          })
        } catch (error) {
          console.error('Error retrieving the room session', error)
          reject(error)
        }
      }
    )
  }
}

/** @internal */
export const createVideoObject = (
  params: BaseComponentOptions<RealTimeVideoApiEvents>
): Video => {
  const video = connect<RealTimeVideoApiEvents, VideoAPI, Video>({
    store: params.store,
    Component: VideoAPI,
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
