import {
  CamelToSnakeCase,
  EntityUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
  InternalFabricMemberEntity,
  MemberCommandParams,
  Rooms,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
  SwEvent,
  CallState,
  CallPlay,
  CallConnect,
  AtLeastOne,
} from '..'

/**
 * Public event types
 * Intentionally not declaring common events with voice APIs (or should we declare these types with a Fabric prefix?)
 */
export type CallJoined = 'call.joined'
export type CallUpdated = 'call.updated'
export type CallLeft = 'call.left'
export type CallRoom = 'call.room'

export type FabricCallConnectState = 'connecting' | 'connected'
export type FabricCallState =
  | 'created'
  | 'ringing'
  | 'answered'
  | 'ending'
  | 'ended'
export type FabricCallDirection = 'inbound' | 'outbound'
export type FabricCallPlayState = 'playing' | 'paused' | 'finished'

interface CallDeviceCommonParams {
  headers?: any[]
}

export interface CallDeviceWebRTCOrSIPParams extends CallDeviceCommonParams {
  from: string
  to: string
}

export interface CallDevicePhoneParams extends CallDeviceCommonParams {
  from_number: string
  to_number: string
}

export interface CallDeviceWebRTCOrSIP {
  type: 'webrtc' | 'sip'
  params: CallDeviceWebRTCOrSIPParams
}

export interface CallDevicePhone {
  type: 'phone'
  params: CallDevicePhoneParams
}

export type CallDevice = CallDeviceWebRTCOrSIP | CallDevicePhone

export type SetAudioFlagsParams = MemberCommandParams &
  AtLeastOne<{
    echoCancellation?: boolean
    autoGain?: boolean
    noiseSuppression?: boolean
  }>

/**
 * Public Contract for a FabricRoomSession
 * List of all the properties we receive from the server for the room session
 * Plus the fabric room methods
 * We do not use this contract anywhere directly.
 */
export interface FabricRoomSessionContract {
  /** Id of the room associated to this room session */
  roomSessionId: string
  /** Id of the room associated to this room session */
  roomId: string
  /** Unique id for this room session */
  id: string
  /** @internal */
  eventChannel: string
  /** Name of this room */
  name: string
  /** Current layout name used in the room. */
  layoutName: string
  /** Display name for this room. Defaults to the value of `name` */
  displayName: string
  /** Whether recording is active */
  recording: boolean
  /** Whether streaming is active */
  streaming: boolean
  /** Prioritize the hand raise for the layout */
  prioritizeHandraise: boolean
  /** Whether muted videos are shown in the room layout. See {@link setHideVideoMuted} */
  hideVideoMuted: boolean
  /** Whether the room is locked */
  locked: boolean
  /** URL to the room preview. */
  previewUrl: string
  /** Metadata associated to this room session. */
  meta: Record<string, unknown>
  /** List of members that are part of this room session */
  members: InternalFabricMemberEntity[]
  /** List of active recordings in the room */
  recordings?: [] // TODO: Finalize the type when the feature is ready
  /** List of active streamings in the room */
  streams?: [] // TODO: Finalize the type when the feature is ready
  /** List of active playbacks in the room */
  playbacks?: [] // TODO: Finalize the type when the feature is ready
  /** Fields that have changed in this room session */
  updated?: Array<Exclude<keyof FabricRoomSessionContract, 'updated'>>

  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted participant anymore. You can use this method to mute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @capabilities
   *  - `room.self.audio_mute`: to mute a local device
   *  - `room.member.audio_mute`: to mute a remote member
   *
   *
   * @example Muting your own microphone:
   * ```typescript
   * await room.audioMute()
   * ```
   *
   * @example Muting the microphone of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.audioMute({memberId: id})
   * ```
   */
  audioMute(params?: MemberCommandParams): Rooms.AudioMuteMember
  /**
   * Unmutes the microphone if it had been previously muted. You can use this
   * method to unmute either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @capabilities
   *  - `room.self.audio_unmute`: to unmute a local device
   *  - `room.member.audio_unmute`: to unmute a remote member
   *
   * @example Unmuting your own microphone:
   * ```typescript
   * await room.audioUnmute()
   * ```
   *
   * @example Unmuting the microphone of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.audioUnmute({memberId: id})
   * ```
   */
  audioUnmute(params?: MemberCommandParams): Rooms.AudioUnmuteMember
  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream. You can use this method to mute either yourself or another
   * participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @capabilities
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * @example Muting your own video:
   * ```typescript
   * await room.videoMute()
   * ```
   *
   * @example Muting the video of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.videoMute({memberId: id})
   * ```
   */
  videoMute(params?: MemberCommandParams): Rooms.VideoMuteMember
  /**
   * Unmutes the video if it had been previously muted. Participants will
   * start seeing the video stream again. You can use this method to unmute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @capabilities
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * @example Unmuting your own video:
   * ```typescript
   * await room.videoUnmute()
   * ```
   *
   * @example Unmuting the video of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.videoUnmute({memberId: id})
   * ```
   */
  videoUnmute(params?: MemberCommandParams): Rooms.VideoUnmuteMember
  /**
   * Sets the input volume level (e.g. for the microphone). You can use this
   * method to set the input volume for either yourself or another participant
   * in the room.
   *
   * @param params
   * @param params.memberId id of the member for which to set input volume. If
   * omitted, sets the volume of the default device in the local client.
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @capabilities
   *  - `room.self.set_input_volume`: to set the volume for a local device
   *  - `room.member.set_input_volume`: to set the volume for a remote member
   *
   * @example Setting your own microphone volume:
   * ```typescript
   * await room.setInputVolume({volume: -10})
   * ```
   *
   * @example Setting the microphone volume of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setInputVolume({memberId: id, volume: -10})
   * ```
   */
  setInputVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetInputVolumeMember
  /**
   * Sets the input level at which the participant is identified as currently
   * speaking. You can use this method to set the input sensitivity for either
   * yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   * @param params.value desired sensitivity. The default value is 30 and the
   * scale goes from 0 (lowest sensitivity, essentially muted) to 100 (highest
   * sensitivity).
   *
   * @capabilities
   *  - `room.self.set_input_sensitivity`: to set the sensitivity for a local
   *    device
   *  - `room.member.set_input_sensitivity`: to set the sensitivity for a
   *    remote member
   *
   * @example Setting your own input sensitivity:
   * ```typescript
   * await room.setInputSensitivity({value: 80})
   * ```
   *
   * @example Setting the input sensitivity of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setInputSensitivity({memberId: id, value: 80})
   * ```
   */
  setInputSensitivity(
    params: MemberCommandWithValueParams
  ): Rooms.SetInputSensitivityMember
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * ```
   */
  getMembers(): Rooms.GetMembers
  /**
   * Mutes the incoming audio. The affected participant will not hear audio
   * from the other participants anymore. You can use this method to make deaf
   * either yourself or another participant in the room.
   *
   * Note that in addition to making a participant deaf, this will also
   * automatically mute the microphone of the target participant (even if
   * there is no `audio_mute` permission). If you want, you can then manually
   * unmute it by calling {@link audioUnmute}.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   *
   * @capabilities
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * @example Making yourself deaf:
   * ```typescript
   * await room.deaf()
   * ```
   *
   * @example Making another participant deaf:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.deaf({memberId: id})
   * ```
   */
  deaf(params?: MemberCommandParams): Rooms.DeafMember
  /**
   * Unmutes the incoming audio. The affected participant will start hearing
   * audio from the other participants again. You can use this method to
   * undeaf either yourself or another participant in the room.
   *
   * Note that in addition to allowing a participants to hear the others, this
   * will also automatically unmute the microphone of the target participant
   * (even if there is no `audio_unmute` permission). If you want, you can then
   * manually mute it by calling {@link audioMute}.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects
   * the default device in the local client.
   *
   * @capabilities
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * @example Undeaf yourself:
   * ```typescript
   * await room.undeaf()
   * ```
   *
   * @example Undeaf another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.undeaf({memberId: id})
   * ```
   */
  undeaf(params?: MemberCommandParams): Rooms.UndeafMember
  /**
   * Sets the output volume level (e.g., for the speaker). You can use this
   * method to set the output volume for either yourself or another participant
   * in the room.
   * @param params
   * @param params.memberId id of the member to affect. If omitted, affects the
   * default device in the local client.
   * @param params.volume desired volume. Values range from -50 to 50, with a
   * default of 0.
   *
   * @capabilities
   *  - `room.self.set_output_volume`: to set the speaker volume for yourself
   *  - `room.member.set_output_volume`: to set the speaker volume for a remote
   *    member
   *
   * @example Setting your own output volume:
   * ```typescript
   * await room.setOutputVolume({volume: -10})
   * ```
   *
   * @example Setting the output volume of another participant:
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setOutputVolume({memberId: id, volume: -10})
   * ```
   */
  setOutputVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetOutputVolumeMember
  /**
   * Removes a specific participant from the room.
   * @param params
   * @param params.memberId id of the member to remove
   *
   * @capabilities
   *  - `room.member.remove`: to remove a remote member
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.removeMember({memberId: id})
   * ```
   */
  removeMember(params: Required<MemberCommandParams>): Rooms.RemoveMember
  /**
   * Returns a list of available layouts for the room. To set a room layout,
   * use {@link setLayout}.
   *
   * @capabilities
   *  - `room.list_available_layouts`
   *
   * @example
   * ```typescript
   * await room.getLayouts()
   * ```
   */
  getLayouts(): Rooms.GetLayouts
  /**
   * Sets a layout for the room. You can obtain a list of available layouts
   * with {@link getLayouts}.
   *
   * @capabilities
   *  - `room.set_layout`
   *  - `room.set_position` (if you need to assign positions)
   *
   * @example Set the 6x6 layout:
   * ```typescript
   * await room.setLayout({name: "6x6"})
   * ```
   */
  setLayout(params: Rooms.SetLayoutParams): Rooms.SetLayout
  /**
   * Assigns a position in the layout for multiple members.
   *
   * @capabilities
   *  - `room.set_position`
   *
   * @example
   * ```js
   * await roomSession.setPositions({
   *   positions: {
   *     "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60": "reserved-1",
   *     "e0c5be44-d6c7-438f-8cda-f859a1a0b1e7": "auto"
   *   }
   * })
   * ```
   */
  setPositions(params: Rooms.SetPositionsParams): Rooms.SetPositions
  /**
   * Lock the room
   *
   * @capabilities
   *  - `room.lock`
   *
   * @example
   * ```typescript
   * await room.lock()
   * ```
   */
  lock(): Rooms.Lock
  /**
   * Unlock the room
   *
   * @capabilities
   *  - `room.unlock`
   *
   * @example
   * ```typescript
   * await room.lock()
   * ```
   */
  unlock(): Rooms.Unlock
  /**
   * Raise or lower the hand of a specific participant in the room.
   * @param params
   * @param params.memberId id of the member to remove
   * @param params.raised boolean flag to raise or lower the hand
   *
   * @capabilities
   *  - `video.self.raisehand` - required to raise a hand
   *  - `video.self.lowerhand` - required to lower a hand
   *  - `video.member.raisehand` - required to raise a hand for another member’s
   *  - `video.member.lowerhand` - required to lower a hand for another member’s
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setHandRaised({ memberId: id, raised: false })
   * ```
   */
  setRaisedHand(params?: Rooms.SetRaisedHandRoomParams): Rooms.SetRaisedHand
  /**
   * Update audio processing flags (echo cancellation, automatic gain control, noise suppression)
   * for yourself or another participant in the room.
   *
   * @param params
   * @param params.memberId - id of the member to update; omit to apply to yourself
   * @param params.echoCancellation - whether to enable (true) or disable (false) echo cancellation
   * @param params.autoGain - whether to enable (true) or disable (false) automatic gain control
   * @param params.noiseSuppression - whether to enable (true) or disable (false) noise suppression
   *
   * @capabilities
   * - `self.audioflags.set` – required to modify your own microphone constraints
   * - `member.audioflags.set` – required to modify another member’s microphone constraints
   *
   * @example
   * ```typescript
   * // Enable echo cancellation and noise suppression for yourself
   * await room.setAudioFlags({
   *   echoCancellation: true,
   *   autoGain: false,
   *   noiseSuppression: true
   * });
   *
   * // Disable automatic gain control for another participant
   * const otherId = 'de550c0c-3fac-4efd-b06f-b5b8614b8966';
   * await room.setAudioFlags({
   *   memberId: otherId,
   *   autoGain: false
   * });
   * ```
   */
  setAudioFlags(params: SetAudioFlagsParams): Promise<void>
}

/**
 * FabricRoomSession properties
 */
export type FabricRoomSessionEntity =
  OnlyStateProperties<FabricRoomSessionContract>

/**
 * FabricRoomSession methods
 */
export type FabricRoomSessionMethods =
  OnlyFunctionProperties<FabricRoomSessionContract>

/**
 * FabricRoomSessionEntity plus `updated` field
 */
export type FabricRoomSessionEntityUpdated =
  EntityUpdated<FabricRoomSessionEntity>

/**
 * FabricRoomSessionEntity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalFabricRoomSessionEntity = {
  [K in NonNullable<
    keyof FabricRoomSessionEntity
  > as CamelToSnakeCase<K>]: FabricRoomSessionEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * List of possible capabilities returned by the server
 */
export type Capability =
  // Self
  | 'self'
  | 'self.mute'
  | 'self.mute.audio'
  | 'self.mute.audio.on'
  | 'self.mute.audio.off'
  | 'self.mute.video'
  | 'self.mute.video.on'
  | 'self.mute.video.off'
  | 'self.deaf'
  | 'self.deaf.on'
  | 'self.deaf.off'
  | 'self.microphone'
  | 'self.microphone.volume.set'
  | 'self.microphone.sensitivity.set'
  | 'self.speaker'
  | 'self.speaker.volume.set'
  | 'self.position.set'
  | 'self.meta'
  | 'self.audioflags.set'

  // Member
  | 'member'
  | 'member.mute'
  | 'member.mute.audio'
  | 'member.mute.audio.on'
  | 'member.mute.audio.off'
  | 'member.mute.video'
  | 'member.mute.video.on'
  | 'member.mute.video.off'
  | 'member.deaf'
  | 'member.deaf.on'
  | 'member.deaf.off'
  | 'member.microphone'
  | 'member.microphone.volume.set'
  | 'member.microphone.sensitivity.set'
  | 'member.speaker'
  | 'member.speaker.volume.set'
  | 'member.position.set'
  | 'member.meta'
  | 'member.audioflags.set'

  // Layout
  | 'layout'
  | 'layout.set'

  // Digit
  | 'digit'
  | 'digit.send'

  // Vmuted
  | 'vmuted'
  | 'vmuted.hide'
  | 'vmuted.hide.on'
  | 'vmuted.hide.off'

  // Lock
  | 'lock'
  | 'lock.on'
  | 'lock.off'

  // Device & Screenshare
  | 'device'
  | 'screenshare'

/**
 * 'call.joined'
 */
export interface CallJoinedEventParams {
  room_session: InternalFabricRoomSessionEntity
  room_id: string
  room_session_id: string
  call_id: string
  member_id: string
  node_id?: string
  origin_call_id: string
  capabilities: Capability[]
}

export interface CallJoinedEvent extends SwEvent {
  event_type: CallJoined
  params: CallJoinedEventParams
}

/**
 * call.updated
 */
export interface CallUpdatedEventParams {
  room_session: InternalFabricRoomSessionEntity
  room_id: string
  room_session_id: string
}

export interface CallUpdatedEvent extends SwEvent {
  event_type: CallUpdated
  params: CallUpdatedEventParams
}

/**
 * call.left
 */
export interface CallLeftEventParams {
  room_session: InternalFabricRoomSessionEntity
  room_id: string
  room_session_id: string
  call_id: string
  member_id: string
  origin_call_id: string
  reason: string
}

export interface CallLeftEvent extends SwEvent {
  event_type: CallLeft
  params: CallLeftEventParams
}

/**
 * call.state
 */
export interface CallStateEventParams {
  call_id: string
  node_id: string
  segment_id: string
  call_state: FabricCallState
  direction: FabricCallDirection
  device: CallDevice
  start_time: number
  answer_time: number
  end_time: number
  room_session_id: string
}

export interface CallStateEvent extends SwEvent {
  event_type: CallState
  params: CallStateEventParams
}

/**
 * call.play
 */
export interface CallPlayEventParams {
  control_id: string
  call_id: string
  node_id: string
  state: FabricCallPlayState
  room_session_id: string
}

export interface CallPlayEvent extends SwEvent {
  event_type: CallPlay
  params: CallPlayEventParams
}

/**
 * call.connect
 */
export interface CallConnectEventParams {
  connect_state: FabricCallConnectState
  call_id: string
  node_id: string
  segment_id: string
  room_session_id: string
  peer?: {
    call_id: string
    node_id: string
    device: CallDevice
  }
}

export interface CallConnectEvent extends SwEvent {
  event_type: CallConnect
  params: CallConnectEventParams
}

/**
 * call.room
 */
export interface CallRoomEventParams {
  joined_status: string // TODO: Need ENUM from the server
  call_id: string
  node_id: string
  segment_id: string
  room_session_id: string
}

export interface CallRoomEvent extends SwEvent {
  event_type: CallRoom
  params: CallRoomEventParams
}

export type FabricRoomEventNames =
  | CallJoined
  | CallUpdated
  | CallLeft
  | CallState
  | CallPlay
  | CallConnect
  | CallRoom

export type FabricRoomEvent =
  | CallJoinedEvent
  | CallUpdatedEvent
  | CallLeftEvent
  | CallStateEvent
  | CallPlayEvent
  | CallConnectEvent
  | CallRoomEvent

export type FabricRoomEventParams =
  | CallJoinedEventParams
  | CallUpdatedEventParams
  | CallLeftEventParams
  | CallStateEventParams
  | CallPlayEventParams
  | CallConnectEventParams
  | CallRoomEventParams
