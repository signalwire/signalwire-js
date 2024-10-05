import {
  BaseConnectionState,
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
  INTERNAL_MEMBER_UPDATABLE_PROPS,
  InternalCallFabricMemberEntity,
  InternalCallFabricMemberUpdatableProps,
  InternalCallFabricMemberEntityUpdated,
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
  InternalVideoLayout,
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
} from '@signalwire/core'
import { MediaEvent } from '@signalwire/webrtc'
import { CallFabricRoomSession } from '../../fabric'

const INTERNAL_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${
    key as keyof InternalCallFabricMemberUpdatableProps
  }` as const
})

/** @deprecated */
export type DeprecatedCallFabricMemberUpdatableProps =
  (typeof INTERNAL_MEMBER_UPDATED_EVENTS)[number]
/** @deprecated */

export type DeprecatedCallFabricMemberHandlerParams = {
  member: InternalCallFabricMemberEntity
}

export type CallFabricMemberHandlerParams = {
  member: InternalCallFabricMemberEntity
}

export type CallFabricMemberUpdatedHandlerParams = {
  member: InternalCallFabricMemberEntityUpdated
  room_id?: string
  room_session_id?: string
}

export type CallFabricMemberListUpdatedParams = {
  members: InternalCallFabricMemberEntity[]
}

export type CallFabricRoomSessionObjectEventsHandlerMap = Record<
  VideoRoomDeviceEventNames,
  (params: DeviceUpdatedEventParams) => void
> &
  Record<
    VideoLayoutEventNames,
    (params: { layout: InternalVideoLayout }) => void
  > &
  Record<
    Exclude<
      VideoMemberEventNames,
      MemberUpdated | MemberUpdatedEventNames | MemberListUpdated
    >,
    (params: CallFabricMemberHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (params: CallFabricMemberUpdatedHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberListUpdated>,
    (params: CallFabricMemberListUpdatedParams) => void
  > &
  Record<
    DeprecatedCallFabricMemberUpdatableProps,
    (params: DeprecatedCallFabricMemberHandlerParams) => void
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
  Record<MediaEvent, () => void> &
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
  Record<BaseConnectionState, (params: CallFabricRoomSession) => void> &
  Record<VideoStreamEventNames, (stream: RoomSessionStream) => void> &
  Record<CallJoined, (stream: CallJoinedEventParams) => void> &
  Record<CallState, (stream: CallStateEventParams) => void> &
  Record<CallStarted, (stream: CallStartedEventParams) => void> &
  Record<CallUpdated, (stream: CallUpdatedEventParams) => void> &
  Record<CallEnded, (stream: CallEndedEventParams) => void>

export type CallFabricRoomSessionObjectEvents = {
  [k in keyof CallFabricRoomSessionObjectEventsHandlerMap]: CallFabricRoomSessionObjectEventsHandlerMap[k]
}
