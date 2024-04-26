import {
  OnlyStateProperties,
  RoomSessionMember,
  VideoRoomSessionEntity,
} from '..'

/**
 * Public Contract for a CallSegment
 */
export interface CallSegmentContract {
  id: string
  roomId: string
  roomSessionId: string
  callId: string
  memberId: string
  room_session: Omit<VideoRoomSessionEntity, 'members'> & {
    members: RoomSessionMember[]
  }
  member: RoomSessionMember
  members: RoomSessionMember[]
}

/**
 * CallSegment properties
 */
export type CallSegmentEntity = OnlyStateProperties<CallSegmentContract>
