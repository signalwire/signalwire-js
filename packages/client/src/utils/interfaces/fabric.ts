import {
  DeviceDisconnectedEventParams,
  DeviceUpdatedEventParams,
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
  BaseConnectionState,
  VideoPosition,
  CallLeftEventParams,
  MemberTalking,
  RoomUpdated,
  MemberJoined,
  MemberLeft,
  CallPlay,
  CallPlayEventParams,
  CallConnect,
  CallConnectEventParams,
  CallRoom,
  InternalMemberEntity,
  InternalMemberEntityUpdated,
  MemberJoinedEventParams,
  CallLayoutChangedEventParams,
  MemberTalkingEventParams,
  MemberLeftEventParams,
  CallSessionEventParams,
  MemberUpdatedEventParams,
  MemberUpdatedEventNames,
} from '@signalwire/core'
import { MediaEventNames } from '@signalwire/webrtc'
// CallCapabilitiesContract and CallSession interfaces removed with unified module
// These types are now placeholders
interface CallCapabilitiesContract {
  // Placeholder interface
}
interface CallSession {
  // Placeholder interface
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
  member: InternalMemberEntity
}

export type CallMemberUpdatedHandlerParams = {
  member: InternalMemberEntityUpdated
  room_id?: string
  room_session_id?: string
}

export type CallMemberListUpdatedParams = {
  members: InternalMemberEntity[]
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
  Record<CallRoom, (stream: CallSessionEventParams) => void> &
  Record<
    RoomJoined | RoomSubscribed,
    (params: InternalCallJoinedEventParams) => void
  > &
  Record<RoomUpdated, (params: CallUpdatedEventParams) => void> &
  Record<RoomLeft, (params?: CallLeftEventParams) => void> &
  Record<MemberJoined, (params: MemberJoinedEventParams) => void> &
  Record<
    MemberUpdated | MemberUpdatedEventNames,
    (params: MemberUpdatedEventParams) => void
  > &
  Record<MemberListUpdated, (params: CallMemberListUpdatedParams) => void> &
  Record<MemberLeft, (params: MemberLeftEventParams) => void> &
  Record<MemberTalking, (params: MemberTalkingEventParams) => void> &
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

// Re-export missing types that index.ts expects
export { CallLayoutChangedEventParams, MemberJoinedEventParams, MemberTalkingEventParams, MemberLeftEventParams, CallSessionEventParams, MemberUpdatedEventParams, InternalMemberEntity } from '@signalwire/core'

// Export CallRoom event params as both names for compatibility
export { CallRoom as CallRoomEventParams } from '@signalwire/core'

// Export CallMember event params (alias for MemberJoinedEventParams)  
export type CallMemberJoinedEventParams = MemberJoinedEventParams
export type CallMemberUpdatedEventParams = MemberUpdatedEventParams
export type CallMemberLeftEventParams = MemberLeftEventParams
export type CallMemberTalkingEventParams = MemberTalkingEventParams
export type CallMemberEventParams = MemberJoinedEventParams | MemberUpdatedEventParams | MemberLeftEventParams | MemberTalkingEventParams
export type CallMemberEntity = InternalMemberEntity
export type InternalCallMemberEntity = InternalMemberEntity

// Placeholder exports for removed unified/fabric functionality
export interface SignalWireClient {}
export interface SignalWireContract {}
export interface SignalWireClientParams {}
export interface GetSubscriberInfoResponse {}
export interface GetSubscriberInfoResult {}
export interface PaginatedResponse<T> {
  data: T[]
  links: {
    self?: string
    next?: string
    prev?: string
    first?: string
  }
}
export interface PaginatedResult<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
  nextPage(): Promise<PaginatedResult<T> | undefined>
  prevPage(): Promise<PaginatedResult<T> | undefined>
  firstPage(): Promise<PaginatedResult<T> | undefined>
  self(): Promise<PaginatedResult<T> | undefined>
}