import {
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
  InternalFabricMemberEntity,
  InternalFabricMemberEntityUpdated,
  MemberListUpdated,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomJoined,
  RoomLeft,
  RoomSubscribed,
  RTCTrackEventName,
  VideoLayoutEventNames,
  VideoRoomDeviceDisconnectedEventNames,
  VideoRoomDeviceUpdatedEventNames,
  CallJoined,
  CallJoinedEventParams as InternalCallJoinedEventParams,
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
  MemberTalking,
  RoomUpdated,
  FabricMemberTalkingEventParams,
  MemberJoined,
  FabricMemberJoinedEventParams,
  FabricMemberUpdatedEventParams,
  FabricMemberLeftEventParams,
  MemberLeft,
  CallPlay,
  CallPlayEventParams,
  CallConnect,
  CallConnectEventParams,
  CallRoom,
  FabricMemberEventNames,
  FabricMemberEventParams,
  FabricMemberEventParamsExcludeTalking,
  FabricMemberContract,
  FabricLayoutChangedEvent,
  FabricMemberJoinedEvent,
  FabricMemberLeftEvent,
  FabricMemberTalkingEvent,
  FabricMemberUpdatedEvent,
  InternalFabricRoomSessionEntity,
  FabricMemberEvent,
  FabricAction,
  FabricRoomSessionMethods,
  FabricMemberEntity,
  FabricRoomEventParams,
} from '@signalwire/core'
import { MediaEventNames } from '@signalwire/webrtc'
import { CallCapabilitiesContract, CallSession } from '../../fabric'

// exporting aliases from the core package with  & {
//  tshack?: undefined
// }
// to stop TS inference to resolve original types 
export type InternalCallMemberEntity = InternalFabricMemberEntity & {
  tshack?: undefined
}
export type InternalCallMemberEntityUpdated =
  InternalFabricMemberEntityUpdated & {
    tshack?: undefined
  }
export type CallMemberEventNames = FabricMemberEventNames & {
  tshack?: undefined
}
export type CallMemberEventParams = FabricMemberEventParams & {
  tshack?: undefined
}
export type CallMemberEventParamsExcludeTalking =
  FabricMemberEventParamsExcludeTalking & {
    tshack?: undefined
  }
export type CallMemberContract = FabricMemberContract & {
  tshack?: undefined
}
export type CallLayoutChangedEvent = FabricLayoutChangedEvent & {
  tshack?: undefined
}
export type CallLayoutChangedEventParams = FabricLayoutChangedEventParams & {
  tshack?: undefined
}
export type CallMemberJoinedEvent = FabricMemberJoinedEvent & {
  tshack?: undefined
}
export type CallMemberLeftEvent = FabricMemberLeftEvent & {
  tshack?: undefined
}
export type CallMemberTalkingEvent = FabricMemberTalkingEvent & {
  tshack?: undefined
}
export type CallMemberUpdatedEvent = FabricMemberUpdatedEvent & {
  tshack?: undefined
}
export type InternalCallRoomSessionEntity = InternalFabricRoomSessionEntity & {
  tshack?: undefined
}
export type CallMemberEvent = FabricMemberEvent & {
  tshack?: undefined
}
export type CallAction = FabricAction & {
  tshack?: undefined
}
export type CallRoomSessionMethods = FabricRoomSessionMethods
export type CallMemberEntity = FabricMemberEntity & {
  tshack?: undefined
}
export type CallRoomEventParams = FabricRoomEventParams & {
  tshack?: undefined
}
export type CallMemberJoinedEventParams = FabricMemberJoinedEventParams & {
  tshack?: undefined
}
export type CallMemberUpdatedEventParams = FabricMemberUpdatedEventParams & {
  tshack?: undefined
}
export type CallMemberLeftEventParams = FabricMemberLeftEventParams & {
  tshack?: undefined
}
export type CallMemberTalkingEventParams = FabricMemberTalkingEventParams & {
  tshack?: undefined
}

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

export type CallMemberHandlerParams = {
  member: InternalCallMemberEntity
}

export type CallMemberUpdatedHandlerParams = {
  member: InternalCallMemberEntityUpdated
  room_id?: string
  room_session_id?: string
}

export type CallMemberListUpdatedParams = {
  members: InternalCallMemberEntity[]
}

export type CallJoinedEventParams = {
  capabilities: CallCapabilitiesContract
} & Omit<InternalCallJoinedEventParams, 'capabilities'>

export type CallSessionEventsHandlerMap = Record<
  VideoRoomDeviceUpdatedEventNames,
  (params: DeviceUpdatedEventParams) => void
> &
  Record<
    VideoRoomDeviceDisconnectedEventNames,
    (params: DeviceDisconnectedEventParams) => void
  > &
  Record<MediaEventNames, () => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<BaseConnectionState, (params: CallSession) => void> &
  Record<CallJoined, (stream: CallJoinedEventParams) => void> &
  Record<CallUpdated, (stream: CallUpdatedEventParams) => void> &
  Record<CallLeft, (stream: CallLeftEventParams) => void> &
  Record<CallState, (stream: CallStateEventParams) => void> &
  Record<CallPlay, (stream: CallPlayEventParams) => void> &
  Record<CallConnect, (stream: CallConnectEventParams) => void> &
  Record<CallRoom, (stream: CallRoomEventParams) => void> &
  Record<
    RoomJoined | RoomSubscribed,
    (params: InternalCallJoinedEventParams) => void
  > &
  Record<RoomUpdated, (params: CallUpdatedEventParams) => void> &
  Record<RoomLeft, (params?: CallLeftEventParams) => void> &
  Record<MemberJoined, (params: CallMemberJoinedEventParams) => void> &
  Record<
    MemberUpdated | MemberUpdatedEventNames,
    (params: CallMemberUpdatedEventParams) => void
  > &
  Record<MemberListUpdated, (params: CallMemberListUpdatedParams) => void> &
  Record<MemberLeft, (params: CallMemberLeftEventParams) => void> &
  Record<MemberTalking, (params: CallMemberTalkingEventParams) => void> &
  Record<VideoLayoutEventNames, (params: CallLayoutChangedEventParams) => void>

export type CallSessionEvents = {
  [k in keyof CallSessionEventsHandlerMap]: CallSessionEventsHandlerMap[k]
}

export interface CallSessionContract {
  /** The `layout.changed` event based on the current room layout */
  currentLayoutEvent: CallLayoutChangedEventParams
  /** The layout returned from the `layout.changed` event based on the current room layout */
  currentLayout: CallLayoutChangedEventParams['layout']
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
   * Answers the incoming call and starts the WebRTC connection
   *
   * @example:
   * ```typescript
   * await call.answer()
   * ```
   */
  answer(): Promise<void>
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
