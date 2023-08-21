import {
  BaseComponentOptions,
  connect,
  ConsumerContract,
  RoomSessionRecording,
  RoomSessionPlayback,
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
  RoomSession,
  RoomSessionFullState,
  RoomSessionUpdated,
  createRoomSessionObject,
} from './RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from './RoomSessionMember'
import { videoCallingWorker } from './workers'

export interface Video extends ConsumerContract<RealTimeVideoApiEvents> {
  /** @internal */
  subscribe(): Promise<void>
  /** @internal */
  _session: RealtimeClient
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

class VideoAPI extends AutoSubscribeConsumer<RealTimeVideoApiEvents> {
  constructor(options: BaseComponentOptions) {
    super(options)

    this.runWorker('videoCallWorker', { worker: videoCallingWorker })
  }

  /** @internal */
  protected subscribeParams = {
    get_initial_state: true,
  }

  async getRoomSessions() {
    return new Promise<{ roomSessions: RoomSession[] }>(
      async (resolve, reject) => {
        try {
          const { rooms = [] }: any = await this.execute({
            method: 'video.rooms.get',
            params: {},
          })

          const roomInstances: RoomSession[] = []
          rooms.forEach((room: any) => {
            let roomInstance = this.instanceMap.get<RoomSession>(room.id)
            if (!roomInstance) {
              roomInstance = createRoomSessionObject({
                store: this.store,
                payload: { room_session: room },
              })
            } else {
              roomInstance.setPayload({
                room_session: room,
              })
            }
            roomInstances.push(roomInstance)
            this.instanceMap.set<RoomSession>(roomInstance.id, roomInstance)
          })

          resolve({ roomSessions: roomInstances })
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

          let roomInstance = this.instanceMap.get<RoomSession>(room.id)
          if (!roomInstance) {
            roomInstance = createRoomSessionObject({
              store: this.store,
              payload: { room_session: room },
            })
          } else {
            roomInstance.setPayload({
              room_session: room,
            })
          }
          this.instanceMap.set<RoomSession>(roomInstance.id, roomInstance)

          resolve({ roomSession: roomInstance })
        } catch (error) {
          console.error('Error retrieving the room session', error)
          reject(error)
        }
      }
    )
  }
}

/** @internal */
export const createVideoObject = (params: BaseComponentOptions): Video => {
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
