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

const BrandTypeId: unique symbol = Symbol.for('sw/client')

  // exporting aliases from the core package with  & Brand<'XXX'> to ensure that the types are branded to client SDK types
interface Brand<in out ID extends string | symbol> {
  readonly [BrandTypeId]?: {
    readonly [id in ID]: ID
  }
}

export type InternalCallMemberEntity = InternalFabricMemberEntity
export type InternalCallMemberEntityUpdated =
  InternalFabricMemberEntityUpdated & Brand<'InternalCallMemberEntityUpdated'>
export type CallMemberEventNames = FabricMemberEventNames
export type CallMemberUpdatedEventNames = FabricMemberUpdatedEventNames

export type CallMemberEventParams = FabricMemberEventParams &
  Brand<'CallMemberEventParams'>
export type CallMemberEventParamsExcludeTalking =
  FabricMemberEventParamsExcludeTalking &
    Brand<'CallMemberEventParamsExcludeTalking'>
export type CallMemberContract = FabricMemberContract &
  Brand<'CallMemberContract'>
export type CallLayoutChangedEvent = FabricLayoutChangedEvent &
  Brand<'CallLayoutChangedEvent'>
export type CallLayoutChangedEventParams = FabricLayoutChangedEventParams &
  Brand<'CallLayoutChangedEventParams'>
export type CallMemberJoinedEvent = FabricMemberJoinedEvent & Brand<'CallMemberJoinedEvent'>
export type CallMemberLeftEvent = FabricMemberLeftEvent & Brand<'CallMemberLeftEvent'>
export type CallMemberTalkingEvent = FabricMemberTalkingEvent & Brand<'CallMemberTalkingEvent'>
export type CallMemberUpdatedEvent = FabricMemberUpdatedEvent & Brand<'CallMemberUpdatedEvent'>
export type InternalCallRoomSessionEntity = InternalFabricRoomSessionEntity & Brand<'InternalCallRoomSessionEntity'>
export type CallMemberEvent = FabricMemberEvent & Brand<'CallMemberEvent'>
export type CallAction = FabricAction & Brand<'CallAction'>
export type CallRoomSessionMethods = FabricRoomSessionMethods
export type CallMemberEntity = FabricMemberEntity & Brand<'CallMemberEntity'>
export type CallRoomEventParams = FabricRoomEventParams & Brand<'CallRoomEventParams'>
export type CallMemberJoinedEventParams = FabricMemberJoinedEventParams & Brand<'CallMemberJoinedEventParams'>

export type CallMemberUpdatedEventParams = FabricMemberUpdatedEventParams & Brand<'CallMemberUpdatedEventParams'>
export type CallMemberLeftEventParams = FabricMemberLeftEventParams & Brand<'CallMemberLeftEventParams'>  
export type CallMemberTalkingEventParams = FabricMemberTalkingEventParams & Brand<'CallMemberTalkingEventParams'>

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
   * Based on the the remote SDP, it will either send `verto.invite` or `verto.answer` to start the call.
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