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
import { CallCapabilitiesContract, CallSession } from '../../unified'

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
export interface CallListeners {
  // Core Call Events
  'call.joined': (stream: CallJoinedEventParams) => void
  'call.updated': (stream: CallUpdatedEventParams) => void
  'call.left': (stream: CallLeftEventParams) => void
  'call.state': (stream: CallStateEventParams) => void
  'call.play': (stream: CallPlayEventParams) => void
  'call.connect': (stream: CallConnectEventParams) => void
  'call.room': (stream: CallSessionEventParams) => void

  // Room Events
  'room.joined': (params: InternalCallJoinedEventParams) => void
  'room.subscribed': (params: InternalCallJoinedEventParams) => void
  'room.updated': (params: CallUpdatedEventParams) => void
  'room.left': (params?: CallLeftEventParams) => void

  // Member Events
  'member.joined': (params: MemberJoinedEventParams) => void
  'member.updated': (params: MemberUpdatedEventParams) => void
  'member.updated.audioMuted': (params: MemberUpdatedEventParams) => void
  'member.updated.videoMuted': (params: MemberUpdatedEventParams) => void
  'member.updated.deaf': (params: MemberUpdatedEventParams) => void
  'member.updated.visible': (params: MemberUpdatedEventParams) => void
  'member.updated.onHold': (params: MemberUpdatedEventParams) => void
  'member.updated.inputVolume': (params: MemberUpdatedEventParams) => void
  'member.updated.outputVolume': (params: MemberUpdatedEventParams) => void
  'member.updated.inputSensitivity': (params: MemberUpdatedEventParams) => void
  'member.updated.handraised': (params: MemberUpdatedEventParams) => void
  'member.updated.echoCancellation': (params: MemberUpdatedEventParams) => void
  'member.updated.autoGain': (params: MemberUpdatedEventParams) => void
  'member.updated.noiseCancellation': (params: MemberUpdatedEventParams) => void
  'member.updated.noiseSuppression': (params: MemberUpdatedEventParams) => void
  'member.left': (params: MemberLeftEventParams) => void
  'member.talking': (params: MemberTalkingEventParams) => void
  'memberList.updated': (params: CallMemberListUpdatedParams) => void

  // Media Events (the ones that caused the original conflict!)
  'media.connected': () => void
  'media.reconnecting': () => void
  'media.disconnected': () => void

  // Connection Events
  connecting: (params: CallSession) => void
  connected: (params: CallSession) => void
  disconnected: (params: CallSession) => void
  disconnecting: (params: CallSession) => void
  reconnecting: (params: CallSession) => void
  reconnected: (params: CallSession) => void

  // Additional BaseConnectionState events
  active: (params: CallSession) => void
  answering: (params: CallSession) => void
  early: (params: CallSession) => void
  hangup: (params: CallSession) => void
  held: (params: CallSession) => void
  new: (params: CallSession) => void
  purge: (params: CallSession) => void
  recovering: (params: CallSession) => void
  requesting: (params: CallSession) => void
  ringing: (params: CallSession) => void
  trying: (params: CallSession) => void

  // Layout Events
  'layout.changed': (params: CallLayoutChangedEventParams) => void

  // Device Events
  'device.updated': (params: DeviceUpdatedEventParams) => void
  'device.disconnected': (params: DeviceDisconnectedEventParams) => void

  // Track Events
  track: (event: RTCTrackEvent) => void

  // Lifecycle Events
  destroy: () => void

  //
  'camera.updated': (params: DeviceUpdatedEventParams) => void
  'camera.disconnected': (params: DeviceDisconnectedEventParams) => void
  'microphone.updated': (params: DeviceUpdatedEventParams) => void
  'microphone.disconnected': (params: DeviceDisconnectedEventParams) => void
  'speaker.updated': (params: DeviceUpdatedEventParams) => void
  'speaker.disconnected': (params: DeviceDisconnectedEventParams) => void
}

//@ts-ignore
function checkTypes(listener: CallListeners): CallSessionEvents {
  return listener
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
