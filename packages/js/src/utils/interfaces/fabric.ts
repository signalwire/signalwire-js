import {
  BaseConnectionState,
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
  INTERNAL_MEMBER_UPDATABLE_PROPS,
  InternalFabricMemberEntity,
  InternalFabricMemberUpdatableProps,
  InternalFabricMemberEntityUpdated,
  MemberListUpdated,
  MemberTalkingEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomAudienceCount,
  RoomJoined,
  RoomLeft,
  RoomLeftEventParams,
  RoomSessionPlayback,
  RoomSessionRecording,
  RoomSessionStream,
  RoomSubscribed,
  RTCTrackEventName,
  VideoLayoutEventNames,
  VideoMemberEventNames,
  VideoMemberTalkingEventParams,
  VideoPlaybackEventNames,
  VideoRecordingEventNames,
  VideoRoomAudienceCountEventParams,
  VideoRoomDeviceDisconnectedEventNames,
  VideoRoomDeviceEventNames,
  VideoRoomDeviceUpdatedEventNames,
  VideoRoomEventParams,
  VideoRoomSessionEventNames,
  VideoRoomSubscribedEventParams,
  VideoStreamEventNames,
  CallJoined,
  CallJoinedEventParams,
  CallState,
  CallStateEventParams,
  CallStarted,
  CallStartedEventParams,
  CallUpdated,
  CallUpdatedEventParams,
  CallEndedEventParams,
  CallEnded,
  JSONRPCMethod,
  FabricLayoutChangedEventParams,
} from '@signalwire/core'
import { MediaEventNames } from '@signalwire/webrtc'
import { FabricRoomSession } from '../../fabric'
import { RoomMethods } from './video'

export interface ExecuteActionParams {
  method: JSONRPCMethod
  extraParams?: Record<string, any>
}

export interface ExecuteMemberActionParams extends ExecuteActionParams {
  channel?: 'audio' | 'video'
  memberId?: string
}

export interface RequestMemberParams {
  node_id: string
  member_id: string
  call_id: string
}

const INTERNAL_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${
    key as keyof InternalFabricMemberUpdatableProps
  }` as const
})

/** @deprecated */
export type DeprecatedFabricMemberUpdatableProps =
  (typeof INTERNAL_MEMBER_UPDATED_EVENTS)[number]
/** @deprecated */

export type DeprecatedFabricMemberHandlerParams = {
  member: InternalFabricMemberEntity
}

export type FabricMemberHandlerParams = {
  member: InternalFabricMemberEntity
}

export type FabricMemberUpdatedHandlerParams = {
  member: InternalFabricMemberEntityUpdated
  room_id?: string
  room_session_id?: string
}

export type FabricMemberListUpdatedParams = {
  members: InternalFabricMemberEntity[]
}

export type FabricRoomSessionEventsHandlerMap = Record<
  VideoRoomDeviceEventNames,
  (params: DeviceUpdatedEventParams) => void
> &
  Record<
    VideoLayoutEventNames,
    (params: FabricLayoutChangedEventParams) => void
  > &
  Record<
    Exclude<
      VideoMemberEventNames,
      MemberUpdated | MemberUpdatedEventNames | MemberListUpdated
    >,
    (params: FabricMemberHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (params: FabricMemberUpdatedHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberListUpdated>,
    (params: FabricMemberListUpdatedParams) => void
  > &
  Record<
    DeprecatedFabricMemberUpdatableProps,
    (params: DeprecatedFabricMemberHandlerParams) => void
  > &
  Record<
    MemberTalkingEventNames,
    (params: VideoMemberTalkingEventParams) => void
  > &
  Record<
    Exclude<VideoRoomSessionEventNames, RoomLeft | RoomJoined | RoomSubscribed>,
    (params: VideoRoomEventParams) => void
  > &
  Record<
    RoomJoined | RoomSubscribed,
    (params: VideoRoomSubscribedEventParams) => void
  > &
  Record<RoomLeft, (params?: RoomLeftEventParams) => void> &
  Record<MediaEventNames, () => void> &
  Record<
    VideoRoomDeviceUpdatedEventNames,
    (params: DeviceUpdatedEventParams) => void
  > &
  Record<
    VideoRoomDeviceDisconnectedEventNames,
    (params: DeviceDisconnectedEventParams) => void
  > &
  Record<
    RoomAudienceCount,
    (params: VideoRoomAudienceCountEventParams) => void
  > &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<VideoRecordingEventNames, (recording: RoomSessionRecording) => void> &
  Record<VideoPlaybackEventNames, (recording: RoomSessionPlayback) => void> &
  Record<BaseConnectionState, (params: FabricRoomSession) => void> &
  Record<VideoStreamEventNames, (stream: RoomSessionStream) => void> &
  Record<CallJoined, (stream: CallJoinedEventParams) => void> &
  Record<CallState, (stream: CallStateEventParams) => void> &
  Record<CallStarted, (stream: CallStartedEventParams) => void> &
  Record<CallUpdated, (stream: CallUpdatedEventParams) => void> &
  Record<CallEnded, (stream: CallEndedEventParams) => void>

export type FabricRoomSessionEvents = {
  [k in keyof FabricRoomSessionEventsHandlerMap]: FabricRoomSessionEventsHandlerMap[k]
}

export type FabricRoomMethods = Pick<
  RoomMethods,
  | 'audioMute'
  | 'audioUnmute'
  | 'deaf'
  | 'getLayouts'
  | 'getMembers'
  | 'lock'
  | 'removeMember'
  | 'setInputVolume'
  | 'setLayout'
  | 'setOutputVolume'
  | 'setPositions'
  | 'setRaisedHand'
  | 'undeaf'
  | 'unlock'
  | 'videoMute'
  | 'videoUnmute'
>
