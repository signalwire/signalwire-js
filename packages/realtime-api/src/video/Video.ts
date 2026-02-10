import {
  RoomSessionRecording,
  RoomSessionPlayback,
  validateEventsToSubscribe,
  EventEmitter,
} from '@signalwire/core'
import {
  RealTimeRoomEvents,
  RealTimeVideoEvents,
  RealTimeVideoEventsHandlerMapping,
  RealTimeRoomEventsHandlerMapping,
  RealTimeVideoListenersEventsMapping,
  RealTimeVideoListeners,
} from '../types/video'
import { RoomSession, RoomSessionAPI } from './RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from './RoomSessionMember'
import { videoCallingWorker } from './workers'
import { SWClient } from '../SWClient'
import { BaseVideo } from './BaseVideo'

export class Video extends BaseVideo<
  RealTimeVideoListeners,
  RealTimeVideoEvents
> {
  protected _eventChannel = 'video.rooms'
  protected _eventMap: RealTimeVideoListenersEventsMapping = {
    onRoomStarted: 'room.started',
    onRoomEnded: 'room.ended',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('videoCallingWorker', {
      worker: videoCallingWorker,
      initialState: {
        video: this,
      },
    })
  }

  protected override getSubscriptions() {
    const eventNamesWithPrefix = this.eventNames().map(
      (event) => `video.${String(event)}`
    ) as EventEmitter.EventNames<RealTimeVideoEvents>[]
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
              roomInstance = new RoomSessionAPI({
                video: this,
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
            roomInstance = new RoomSessionAPI({
              video: this,
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
  RealTimeRoomEvents,
  RealTimeRoomEventsHandlerMapping,
  RealTimeVideoEvents,
  RealTimeVideoEventsHandlerMapping,
  RoomSession,
  RoomSessionMember,
  RoomSessionMemberUpdated,
  RoomSessionPlayback,
  RoomSessionRecording,
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
