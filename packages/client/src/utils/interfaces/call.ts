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
  CallSessionDeviceDisconnectedEventNames,
  CallSessionDeviceUpdatedEventNames,
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
  type VideoPositions,
  type Rooms,
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
  CallSessionDeviceUpdatedEventNames,
  (params: DeviceUpdatedEventParams) => void
> &
  Record<
    CallSessionDeviceDisconnectedEventNames,
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
export type StartScreenShareOptions = {
  /** Whether the screen share object should automatically join the room */
  autoJoin?: boolean
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true`. */
  video?: MediaStreamConstraints['video']
  layout?: string
  positions?: VideoPositions
}
interface CallMemberSelfMethodsInterface {
  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted device anymore.
   * @example Muting the microphone:
   * ```typescript
   * await roomdevice.audioMute()
   * ```
   */
  audioMute(): Rooms.AudioMuteMember

  /**
   * Unmutes the microphone if it had been previously muted.
   *
   * @example Unmuting the microphone:
   * ```typescript
   * await calldevice.audioUnmute()
   * ```
   */
  audioUnmute(): Rooms.AudioUnmuteMember

  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream.
   *
   * @example Muting the camera:
   * ```typescript
   * await roomdevice.videoMute()
   * ```
   */
  videoMute(): Rooms.VideoMuteMember

  /**
   * Unmutes the video if it had been previously muted. Participants will start
   * seeing the video stream again.
   *
   * @example Unmuting the camera:
   * ```typescript
   * await roomdevice.videoUnmute()
   * ```
   */
  videoUnmute(): Rooms.VideoUnmuteMember

  /**
   * @deprecated Use {@link setInputVolume} instead.
   */
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input volume level (e.g. for the microphone).
   * @param params
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @example
   * ```typescript
   * await roomdevice.setMicrophoneVolume({volume: -10})
   * ```
   */
  setInputVolume(params: { volume: number }): Rooms.SetInputVolumeMember

  /**
   * Sets the input level at which the participant is identified as currently
   * speaking.
   * @param params
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   *
   * @example
   * ```typescript
   * await roomdevice.setInputSensitivity({value: 80})
   * ```
   */
  setInputSensitivity(params: {
    value: number
  }): Rooms.SetInputSensitivityMember
}

export interface CallSessionDeviceMethods
  extends CallMemberSelfMethodsInterface {}

export interface CallSessionScreenShareMethods
  extends CallMemberSelfMethodsInterface {}

export interface BaseCallSessionDialParams {
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
  receiveAudio?: boolean
  receiveVideo?: boolean
  sendAudio?: boolean
  sendVideo?: boolean
}

export type AudioElement = HTMLAudioElement & {
  sinkId?: string
  setSinkId?: (id: string) => Promise<void>
}
