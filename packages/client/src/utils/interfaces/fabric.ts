import {
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
  InternalFabricMemberEntity,
  InternalFabricMemberEntityUpdated,
  MemberListUpdated,
  MemberUpdated,
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
  FabricMemberUpdatedEventNames,
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

// Import ts-toolbelt for type computation
import { A } from 'ts-toolbelt'
import { ShallowCompute } from '../typeUtils'

export type InternalCallMemberEntity = InternalFabricMemberEntity
export type InternalCallMemberEntityUpdated = A.Compute<
  InternalFabricMemberEntityUpdated,
  'deep'
>
export type CallMemberEventNames = FabricMemberEventNames
export type CallMemberUpdatedEventNames = FabricMemberUpdatedEventNames

export type CallMemberEventParams = A.Compute<FabricMemberEventParams, 'deep'>
export type CallMemberEventParamsExcludeTalking = A.Compute<
  FabricMemberEventParamsExcludeTalking,
  'deep'
>
export type CallMemberContract = ShallowCompute<FabricMemberContract>
export type CallLayoutChangedEvent = A.Compute<FabricLayoutChangedEvent, 'deep'>
export type CallLayoutChangedEventParams = A.Compute<
  FabricLayoutChangedEventParams,
  'deep'
>
export type CallMemberJoinedEvent = A.Compute<FabricMemberJoinedEvent, 'deep'>
export type CallMemberLeftEvent = A.Compute<FabricMemberLeftEvent, 'deep'>
export type CallMemberTalkingEvent = A.Compute<FabricMemberTalkingEvent, 'deep'>
export type CallMemberUpdatedEvent = A.Compute<FabricMemberUpdatedEvent, 'deep'>
export type InternalCallRoomSessionEntity = A.Compute<
  InternalFabricRoomSessionEntity,
  'deep'
>
export type CallMemberEvent = A.Compute<FabricMemberEvent, 'deep'>
export type CallAction = A.Compute<FabricAction, 'deep'>
export type CallRoomSessionMethods = FabricRoomSessionMethods
export type CallMemberEntity = A.Compute<FabricMemberEntity, 'deep'>
export type CallRoomEventParams = A.Compute<FabricRoomEventParams, 'deep'>
export type CallMemberJoinedEventParams = A.Compute<
  FabricMemberJoinedEventParams,
  'deep'
>

export type CallMemberUpdatedEventParams = A.Compute<
  FabricMemberUpdatedEventParams,
  'deep'
>
export type CallMemberLeftEventParams = A.Compute<
  FabricMemberLeftEventParams,
  'deep'
>  
export type CallMemberTalkingEventParams = A.Compute<
  FabricMemberTalkingEventParams,
  'deep'
>

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
    MemberUpdated | CallMemberUpdatedEventNames,
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
