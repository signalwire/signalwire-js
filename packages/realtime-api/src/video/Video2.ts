import {
  RoomSessionRecording,
  RoomSessionPlayback,
  validateEventsToSubscribe,
  EventEmitter,
} from '@signalwire/core'
import {
  RealTimeRoomApiEvents,
  RealTimeVideoApiEvents,
  RealTimeVideoApiEventsHandlerMapping,
  RealTimeRoomApiEventsHandlerMapping,
  RealtimeVideoEvents,
  RealtimeVideoListenersEventsMapping,
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
import { videoClientWorker } from './workers'
import { SWClient } from '../SWClient'
import { BaseVideo } from './BaseVideo'

interface VideoListenOptions {
  onRoomStarted?: (room: RoomSession) => unknown
  onRoomEnded?: (room: RoomSession) => unknown
}

export class Video extends BaseVideo<VideoListenOptions, RealtimeVideoEvents> {
  protected eventChannel = 'video.rooms'
  protected subscribeParams = { get_initial_state: true }
  protected _eventMap: RealtimeVideoListenersEventsMapping = {
    onRoomStarted: 'room.started',
    onRoomEnded: 'room.ended',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('videoClientWorker', {
      worker: videoClientWorker,
      initialState: {
        video: this,
      },
    })
  }

  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<RealtimeVideoEvents>[]
    return validateEventsToSubscribe(eventNamesWithPrefix)
  }

  async getRoomSessions() {
    return new Promise<{ roomSessions: RoomSession[] }>(
      async (resolve, reject) => {
        try {
          const { rooms = [] }: any = await this._client.execute({
            method: 'video.rooms.get',
            params: {},
          })

          const roomInstances: RoomSession[] = []
          rooms.forEach((room: any) => {
            let roomInstance = this._client.instanceMap.get<RoomSession>(
              room.id
            )
            if (!roomInstance) {
              roomInstance = createRoomSessionObject({
                store: this._client.store,
                payload: { room_session: room },
              })
            } else {
              roomInstance.setPayload({
                room_session: room,
              })
            }
            roomInstances.push(roomInstance)
            this._client.instanceMap.set<RoomSession>(
              roomInstance.id,
              roomInstance
            )
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
          const { room }: any = await this._client.execute({
            method: 'video.room.get',
            params: {
              room_session_id: id,
            },
          })

          let roomInstance = this._client.instanceMap.get<RoomSession>(room.id)
          if (!roomInstance) {
            roomInstance = createRoomSessionObject({
              store: this._client.store,
              payload: { room_session: room },
            })
          } else {
            roomInstance.setPayload({
              room_session: room,
            })
          }
          this._client.instanceMap.set<RoomSession>(
            roomInstance.id,
            roomInstance
          )

          resolve({ roomSession: roomInstance })
        } catch (error) {
          console.error('Error retrieving the room session', error)
          reject(error)
        }
      }
    )
  }
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