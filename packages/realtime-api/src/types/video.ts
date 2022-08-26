import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomUpdated,
  RoomSubscribed,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
  Rooms,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomAudienceCount,
  VideoRoomAudienceCountEventParams,
} from '@signalwire/core'
import type {
  RoomSession,
  RoomSessionUpdated,
  RoomSessionFullState,
} from '../video/RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from '../video/RoomSessionMember'

export type RealTimeVideoApiEventsHandlerMapping = Record<
  GlobalVideoEvents,
  (room: RoomSession) => void
>

export type RealTimeVideoApiEvents = {
  [k in keyof RealTimeVideoApiEventsHandlerMapping]: RealTimeVideoApiEventsHandlerMapping[k]
}

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<
    Exclude<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMember) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMemberUpdated) => void
  > &
  Record<MemberTalkingEventNames, (member: RoomSessionMember) => void> &
  Record<RoomStarted | RoomEnded, (roomSession: RoomSession) => void> &
  Record<RoomUpdated, (roomSession: RoomSessionUpdated) => void> &
  Record<
    RoomAudienceCount,
    (params: VideoRoomAudienceCountEventParams) => void
  > &
  Record<RoomSubscribed, (roomSessionFull: RoomSessionFullState) => void> &
  Rooms.RoomSessionRecordingEventsHandlerMapping &
  Rooms.RoomSessionPlaybackEventsHandlerMapping &
  Rooms.RoomSessionStreamEventsHandlerMapping

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}
