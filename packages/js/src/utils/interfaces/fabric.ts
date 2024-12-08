import {
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
  InternalFabricMemberEntity,
  InternalFabricMemberEntityUpdated,
  MemberListUpdated,
  MemberTalkingEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomJoined,
  RoomLeft,
  RoomLeftEventParams,
  RoomSessionStream,
  RoomSubscribed,
  RTCTrackEventName,
  VideoLayoutEventNames,
  VideoMemberEventNames,
  VideoMemberTalkingEventParams,
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
  CallUpdated,
  CallUpdatedEventParams,
  CallLeft,
  JSONRPCMethod,
  FabricLayoutChangedEventParams,
  BaseConnectionState,
  VideoPosition,
  CallLeftEventParams,
} from '@signalwire/core'
import { MediaEventNames } from '@signalwire/webrtc'
import { FabricRoomSession } from '../../fabric'

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
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<BaseConnectionState, (params: FabricRoomSession) => void> &
  Record<VideoStreamEventNames, (stream: RoomSessionStream) => void> &
  Record<CallJoined, (stream: CallJoinedEventParams) => void> &
  Record<CallUpdated, (stream: CallUpdatedEventParams) => void> &
  Record<CallLeft, (stream: CallLeftEventParams) => void> &
  Record<CallState, (stream: CallStateEventParams) => void>

export type FabricRoomSessionEvents = {
  [k in keyof FabricRoomSessionEventsHandlerMap]: FabricRoomSessionEventsHandlerMap[k]
}

export interface FabricRoomSessionContract {
  /** The `layout.changed` event based on the current room layout */
  currentLayoutEvent: FabricLayoutChangedEventParams
  /** The layout returned from the `layout.changed` event based on the current room layout */
  currentLayout: FabricLayoutChangedEventParams['layout']
  /** The current position of the member returned from the `layout.changed` event */
  currentPosition: VideoPosition | undefined
  /**
   * Starts the call via the WebRTC connection
   *
   * @example:
   * ```typescript
   * await call.start()
   * ```
   */
  start(): Promise<void>
  /**
   * Hangs up the current call and disconnects the WebRTC connection.
   * If an RTC Peer ID is passed, the method will only disconnect that Peer, otherwise all Peers will be destroyed
   *
   * @example:
   * ```typescript
   * await call.hangup()
   * ```
   */
  hangup(id?: string): Promise<void>
}
