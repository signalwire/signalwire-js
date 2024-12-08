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
} from '..'

// TODO: Finish the Call Fabric room session contract.
// Omit VideoRoomSessionContract properties which are not offered in CF SDK

/**
 * Public Contract for a FabricRoomSession
 * List of all the properties we receive from the server for the room plus the fabric room methods.
 * We do not use this contract anywhere directly.
 */
export interface FabricRoomSessionContract {
  /** Unique id for this room session */
  id: string
  /** Display name for this room. Defaults to the value of `name` */
  displayName: string
  /** Id of the room associated to this room session */
  roomId: string
  /** Id of the room associated to this room session */
  roomSessionId: string
  /** List of this room capabilities (operations) */
  capabilities: string[] // TODO: Include more strong typed - Need a list of all capabilities from the server
  /** Name of this room */
  name: string
  /** URL to the room preview. */
  previewUrl?: string
  /** Current layout name used in the room. */
  layoutName: string
  /** Whether the room is locked */
  locked: boolean
  /** List of members that are part of this room session */
  members: InternalFabricMemberEntity[]
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
   *  - `video.member.raisehand`: to raise a hand
   *  - `video.member.lowerhand`: to lower a hand
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.setHandRaised({ memberId: id, raised: false })
   * ```
   */
  setRaisedHand(params?: Rooms.SetRaisedHandRoomParams): Rooms.SetRaisedHand
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
