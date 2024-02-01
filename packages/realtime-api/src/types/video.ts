import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomUpdated,
  RoomSubscribed,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  RoomAudienceCount,
  VideoRoomAudienceCountEventParams,
  OnRoomStarted,
  OnRoomEnded,
  OnRoomUpdated,
  OnRoomAudienceCount,
  OnRoomSubscribed,
  OnMemberUpdated,
  OnLayoutChanged,
  OnMemberJoined,
  MemberJoined,
  OnMemberLeft,
  MemberLeft,
  OnMemberTalking,
  MemberTalking,
  OnMemberListUpdated,
  MemberListUpdated,
  PlaybackStarted,
  OnPlaybackStarted,
  OnPlaybackUpdated,
  PlaybackUpdated,
  OnPlaybackEnded,
  PlaybackEnded,
  OnRecordingStarted,
  RecordingStarted,
  OnRecordingUpdated,
  RecordingUpdated,
  OnRecordingEnded,
  RecordingEnded,
  OnStreamStarted,
  OnStreamEnded,
  StreamStarted,
  StreamEnded,
  OnMemberTalkingStarted,
  MemberTalkingStarted,
  OnMemberTalkingEnded,
  MemberTalkingEnded,
  OnMemberDeaf,
  OnMemberVisible,
  OnMemberAudioMuted,
  OnMemberVideoMuted,
  OnMemberInputVolume,
  OnMemberOutputVolume,
  OnMemberInputSensitivity,
  VideoPlaybackEventNames,
  VideoRecordingEventNames,
  VideoStreamEventNames,
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
} from '@signalwire/core'
import type { RoomSession } from '../video/RoomSession'
import type {
  RoomSessionMember,
  RoomSessionMemberUpdated,
} from '../video/RoomSessionMember'
import {
  RoomSessionPlayback,
  RoomSessionPlaybackPromise,
} from '../video/RoomSessionPlayback'
import {
  RoomSessionRecording,
  RoomSessionRecordingPromise,
} from '../video/RoomSessionRecording'
import {
  RoomSessionStream,
  RoomSessionStreamPromise,
} from '../video/RoomSessionStream'
import { RoomMethods } from '../video/methods'

/**
 * Public Contract for a realtime VideoRoomSession
 */
export interface VideoRoomSessionContract {
  /** Unique id for this room session */
  id: string
  /** Display name for this room. Defaults to the value of `name` */
  displayName: string
  /** Id of the room associated to this room session */
  roomId: string
  /** @internal */
  eventChannel: string
  /** Name of this room */
  name: string
  /** Whether recording is active */
  recording: boolean
  /** Whether muted videos are shown in the room layout. See {@link setHideVideoMuted} */
  hideVideoMuted: boolean
  /** URL to the room preview. */
  previewUrl?: string
  /** Current layout name used in the room. */
  layoutName: string
  /** Whether the room is locked */
  locked: boolean
  /** Metadata associated to this room session. */
  meta?: Record<string, unknown>
  /** Fields that have changed in this room session */
  updated?: Array<Exclude<keyof VideoRoomSessionContract, 'updated'>>
  /** Whether the room is streaming */
  streaming: boolean

  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted participant anymore. You can use this method to mute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @permissions
   *  - `room.self.audio_mute`: to mute a local device
   *  - `room.member.audio_mute`: to mute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  audioMute(params?: MemberCommandParams): RoomMethods.AudioMuteMember
  /**
   * Unmutes the microphone if it had been previously muted. You can use this
   * method to unmute either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.audio_unmute`: to unmute a local device
   *  - `room.member.audio_unmute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  audioUnmute(params?: MemberCommandParams): RoomMethods.AudioUnmuteMember
  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream. You can use this method to mute either yourself or another
   * participant in the room.
   * @param params
   * @param params.memberId id of the member to mute. If omitted, mutes the
   * default device in the local client.
   *
   * @permissions
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  videoMute(params?: MemberCommandParams): RoomMethods.VideoMuteMember
  /**
   * Unmutes the video if it had been previously muted. Participants will
   * start seeing the video stream again. You can use this method to unmute
   * either yourself or another participant in the room.
   * @param params
   * @param params.memberId id of the member to unmute. If omitted, unmutes
   * the default device in the local client.
   *
   * @permissions
   *  - `room.self.video_mute`: to unmute a local device
   *  - `room.member.video_mute`: to unmute a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  videoUnmute(params?: MemberCommandParams): RoomMethods.VideoUnmuteMember
  /** @deprecated Use {@link setInputVolume} instead. */
  setMicrophoneVolume(
    params: MemberCommandWithVolumeParams
  ): RoomMethods.SetInputVolumeMember
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
   * @permissions
   *  - `room.self.set_input_volume`: to set the volume for a local device
   *  - `room.member.set_input_volume`: to set the volume for a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  ): RoomMethods.SetInputVolumeMember
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
   * @permissions
   *  - `room.self.set_input_sensitivity`: to set the sensitivity for a local
   *    device
   *  - `room.member.set_input_sensitivity`: to set the sensitivity for a
   *    remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  ): RoomMethods.SetInputSensitivityMember
  /**
   * Returns a list of members currently in the room.
   *
   * @example
   * ```typescript
   * await room.getMembers()
   * ```
   */
  getMembers(): RoomMethods.GetMembers
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
   * @permissions
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  deaf(params?: MemberCommandParams): RoomMethods.DeafMember
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
   * @permissions
   *  - `room.self.deaf`: to make yourself deaf
   *  - `room.member.deaf`: to make deaf a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  undeaf(params?: MemberCommandParams): RoomMethods.UndeafMember
  /** @deprecated Use {@link setOutputVolume} instead. */
  setSpeakerVolume(
    params: MemberCommandWithVolumeParams
  ): RoomMethods.SetOutputVolumeMember
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
   * @permissions
   *  - `room.self.set_output_volume`: to set the speaker volume for yourself
   *  - `room.member.set_output_volume`: to set the speaker volume for a remote
   *    member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  ): RoomMethods.SetOutputVolumeMember
  /**
   * Removes a specific participant from the room.
   * @param params
   * @param params.memberId id of the member to remove
   *
   * @permissions
   *  - `room.member.remove`: to remove a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const id = 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   * await room.removeMember({memberId: id})
   * ```
   */
  removeMember(params: Required<MemberCommandParams>): RoomMethods.RemoveMember
  /**
   * Removes all the participants from the room.
   *
   * @permissions
   *  - `room.member.remove`: to remove a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.removeAllMembers()
   * ```
   */
  removeAllMembers(): RoomMethods.RemoveAllMembers
  /**
   * Show or hide muted videos in the room layout. Members that have been muted
   * via {@link videoMute} will display a mute image instead of the video, if
   * this setting is enabled.
   *
   * @param value whether to show muted videos in the room layout.
   *
   * @permissions
   *  - `room.hide_video_muted`
   *  - `room.show_video_muted`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await roomSession.setHideVideoMuted(false)
   * ```
   */
  setHideVideoMuted(value: boolean): RoomMethods.SetHideVideoMuted
  /**
   * Returns a list of available layouts for the room. To set a room layout,
   * use {@link setLayout}.
   *
   * @permissions
   *  - `room.list_available_layouts`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.getLayouts()
   * ```
   */
  getLayouts(): RoomMethods.GetLayouts
  /**
   * Sets a layout for the room. You can obtain a list of available layouts
   * with {@link getLayouts}.
   *
   * @permissions
   *  - `room.set_layout`
   *  - `room.set_position` (if you need to assign positions)
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Set the 6x6 layout:
   * ```typescript
   * await room.setLayout({name: "6x6"})
   * ```
   */
  setLayout(params: RoomMethods.SetLayoutParams): RoomMethods.SetLayout
  /**
   * Assigns a position in the layout for multiple members.
   *
   * @permissions
   *  - `room.set_position`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
  setPositions(params: RoomMethods.SetPositionsParams): RoomMethods.SetPositions
  /**
   * Assigns a position in the layout to the specified member.
   *
   * @permissions
   *  - `room.self.set_position`: to set the position for the local member
   *  - `room.member.set_position`: to set the position for a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```js
   * await roomSession.setMemberPosition({
   *   memberId: "1bf4d4fb-a3e4-4d46-80a8-3ebfdceb2a60",
   *   position: "off-canvas"
   * })
   * ```
   */
  setMemberPosition(
    params: RoomMethods.SetMemberPositionParams
  ): RoomMethods.SetMemberPosition
  /**
   * Obtains a list of recordings for the current room session. To download the
   * actual mp4 file, please use the [REST
   * API](https://developer.signalwire.com/apis/reference/overview).
   *
   * @permissions
   *  - `room.recording`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.getRecordings()
   * ```
   *
   * From your server, you can obtain the mp4 file using the [REST API](https://developer.signalwire.com/apis/reference/overview):
   * ```typescript
   * curl --request GET \
   *      --url https://<yourspace>.signalwire.com/api/video/room_recordings/<recording_id> \
   *      --header 'Accept: application/json' \
   *      --header 'Authorization: Basic <your API token>'
   * ```
   */
  getRecordings(): RoomMethods.GetRecordings
  /**
   * Starts the recording of the room. You can use the returned
   * {@link RoomSessionRecording} object to control the recording (e.g., pause,
   * resume, stop).
   *
   * @permissions
   *  - `room.recording`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const rec = await room.startRecording().onStarted()
   * await rec.stop()
   * ```
   */
  startRecording(
    params?: RoomMethods.StartRecordingParams
  ): RoomSessionRecordingPromise
  /**
   * Obtains a list of recordings for the current room session.
   *
   * @permissions
   *  - `room.playback`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @returns The returned objects contain all the properties of a
   * {@link RoomSessionPlayback}, but no methods.
   */
  getPlaybacks(): RoomMethods.GetPlaybacks
  /**
   * Starts a playback in the room. You can use the returned
   * {@link RoomSessionPlayback} object to control the playback (e.g., pause,
   * resume, setVolume and stop).
   *
   * @permissions
   *  - `room.playback`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const playback = await roomSession.play({ url: 'rtmp://example.com/foo' }).onStarted()
   * await playback.stop()
   * ```
   */
  play(params: RoomMethods.PlayParams): RoomSessionPlaybackPromise
  /**
   * Assigns custom metadata to the RoomSession. You can use this to store
   * metadata whose meaning is entirely defined by your application.
   *
   * Note that calling this method overwrites any metadata that had been
   * previously set on this RoomSession.
   *
   * @param meta The medatada object to assign to the RoomSession.
   *
   * @permissions
   *  - `room.set_meta`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```js
   * await roomSession.setMeta({ foo: 'bar' })
   * ```
   */
  setMeta(params: RoomMethods.SetMetaParams): RoomMethods.SetMeta
  /**
   * Retrieve the custom metadata for the RoomSession.
   *
   * @example
   * ```js
   * const { meta } = await roomSession.getMeta()
   * ```
   */
  getMeta(): RoomMethods.GetMeta
  updateMeta(params: RoomMethods.UpdateMetaParams): RoomMethods.UpdateMeta
  deleteMeta(params: RoomMethods.DeleteMetaParams): RoomMethods.DeleteMeta
  /**
   * Assigns custom metadata to the specified RoomSession member. You can use
   * this to store metadata whose meaning is entirely defined by your
   * application.
   *
   * Note that calling this method overwrites any metadata that had been
   * previously set on the specified member.
   *
   * @param params.memberId Id of the member to affect. If omitted, affects the
   * default device in the local client.
   * @param params.meta The medatada object to assign to the member.
   *
   * @permissions
   *  - `room.self.set_meta`: to set the metadata for the local member
   *  - `room.member.set_meta`: to set the metadata for a remote member
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * Setting metadata for the current member:
   * ```js
   * await roomSession.setMemberMeta({
   *   meta: {
   *     email: 'joe@example.com'
   *   }
   * })
   * ```
   *
   * @example
   * Setting metadata for another member:
   * ```js
   * await roomSession.setMemberMeta({
   *   memberId: 'de550c0c-3fac-4efd-b06f-b5b8614b8966'  // you can get this from getMembers()
   *   meta: {
   *     email: 'joe@example.com'
   *   }
   * })
   * ```
   */
  setMemberMeta(
    params: RoomMethods.SetMemberMetaParams
  ): RoomMethods.SetMemberMeta
  /**
   * Retrieve the custom metadata for the specified RoomSession member.
   *
   * @param params.memberId Id of the member to retrieve the meta. If omitted, fallback to the current memberId.
   *
   * @example
   * ```js
   * const { meta } = await roomSession.getMemberMeta({ memberId: 'de550c0c-3fac-4efd-b06f-b5b8614b8966' })
   * ```
   */
  getMemberMeta(params?: MemberCommandParams): RoomMethods.GetMemberMeta
  updateMemberMeta(
    params: RoomMethods.UpdateMemberMetaParams
  ): RoomMethods.UpdateMemberMeta
  deleteMemberMeta(
    params: RoomMethods.DeleteMemberMetaParams
  ): RoomMethods.DeleteMemberMeta
  promote(params: RoomMethods.PromoteMemberParams): RoomMethods.PromoteMember
  demote(params: RoomMethods.DemoteMemberParams): RoomMethods.DemoteMember
  /**
   * Obtains a list of streams for the current room session.
   *
   * @permissions
   *  - `room.stream`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.getStreams()
   * ```
   */
  getStreams(): RoomMethods.GetStreams
  /**
   * Starts to stream the room to the provided URL. You can use the returned
   * {@link RoomSessionStream} object to then stop the stream.
   *
   * @permissions
   *  - `room.stream.start` or `room.stream`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * const stream = await room.startStream({ url: 'rtmp://example.com' }).onStarted()
   * await stream.stop()
   * ```
   */
  startStream(params: RoomMethods.StartStreamParams): RoomSessionStreamPromise
  /**
   * Lock the room
   *
   * @permissions
   *  - `room.lock`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.lock()
   * ```
   */
  lock(): RoomMethods.Lock
  /**
   * Unlock the room
   *
   * @permissions
   *  - `room.unlock`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.unlock()
   * ```
   */
  unlock(): RoomMethods.Unlock
  /**
   * Raise or lower hand of a member
   *
   * @permissions
   *  - `room.member.raisehand` and `room.member.lowerhand`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.setRaisedHand({ raised: true, memberId: '123...' })
   * ```
   */
  setRaisedHand(
    params: RoomMethods.SetRaisedHandRoomParams
  ): RoomMethods.SetRaisedHand
  /**
   * Set hand raise prioritization
   *
   * @permissions
   *  - `room.self.prioritize_handraise`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example
   * ```typescript
   * await room.setPrioritizeHandraise(true)
   * ```
   */
  setPrioritizeHandraise(
    prioritize: boolean
  ): RoomMethods.SetPrioritizeHandraise
}

/**
 * RealTime Video API
 */
export type RealTimeVideoEventsHandlerMapping = Record<
  GlobalVideoEvents,
  (room: RoomSession) => void
>

export type RealTimeVideoEvents = {
  [k in keyof RealTimeVideoEventsHandlerMapping]: RealTimeVideoEventsHandlerMapping[k]
}

export interface RealTimeVideoListeners {
  onRoomStarted?: (room: RoomSession) => unknown
  onRoomEnded?: (room: RoomSession) => unknown
}

export type RealTimeVideoListenersEventsMapping = {
  onRoomStarted: RoomStarted
  onRoomEnded: RoomEnded
}

/**
 * RealTime Video Room API
 */
// TODO: replace `any` with proper types.
export type RealTimeRoomEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<
    Exclude<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMember) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (member: RoomSessionMemberUpdated) => void
  > &
  Record<MemberTalkingEventNames, (member: RoomSessionMember) => void> &
  Record<RoomStarted | RoomEnded, (roomSession: RoomSession) => void> &
  Record<RoomUpdated, (roomSession: RoomSession) => void> &
  Record<
    RoomAudienceCount,
    (params: VideoRoomAudienceCountEventParams) => void
  > &
  Record<RoomSubscribed, (roomSessionFull: RoomSession) => void> &
  Record<PlaybackStarted, (playback: RoomSessionPlayback) => void> &
  Record<PlaybackUpdated, (playback: RoomSessionPlayback) => void> &
  Record<PlaybackEnded, (playback: RoomSessionPlayback) => void> &
  Record<RecordingStarted, (recording: RoomSessionRecording) => void> &
  Record<RecordingUpdated, (recording: RoomSessionRecording) => void> &
  Record<RecordingEnded, (recording: RoomSessionRecording) => void> &
  Record<StreamStarted, (stream: RoomSessionStream) => void> &
  Record<StreamEnded, (stream: RoomSessionStream) => void>

export type RealTimeRoomEvents = {
  [k in keyof RealTimeRoomEventsHandlerMapping]: RealTimeRoomEventsHandlerMapping[k]
}

export interface RealTimeRoomListeners {
  onRoomSubscribed?: (room: RoomSession) => unknown
  onRoomStarted?: (room: RoomSession) => unknown
  onRoomUpdated?: (room: RoomSession) => unknown
  onRoomEnded?: (room: RoomSession) => unknown
  onRoomAudienceCount?: (params: VideoRoomAudienceCountEventParams) => unknown
  onLayoutChanged?: (layout: any) => unknown
  onMemberJoined?: (member: RoomSessionMember) => unknown
  onMemberUpdated?: (member: RoomSessionMember) => unknown
  onMemberListUpdated?: (member: RoomSessionMember) => unknown
  onMemberLeft?: (member: RoomSessionMember) => unknown
  onMemberDeaf?: (member: RoomSessionMember) => unknown
  onMemberVisible?: (member: RoomSessionMember) => unknown
  onMemberAudioMuted?: (member: RoomSessionMember) => unknown
  onMemberVideoMuted?: (member: RoomSessionMember) => unknown
  onMemberInputVolume?: (member: RoomSessionMember) => unknown
  onMemberOutputVolume?: (member: RoomSessionMember) => unknown
  onMemberInputSensitivity?: (member: RoomSessionMember) => unknown
  onMemberTalking?: (member: RoomSessionMember) => unknown
  onMemberTalkingStarted?: (member: RoomSessionMember) => unknown
  onMemberTalkingEnded?: (member: RoomSessionMember) => unknown
  onPlaybackStarted?: (playback: RoomSessionPlayback) => unknown
  onPlaybackUpdated?: (playback: RoomSessionPlayback) => unknown
  onPlaybackEnded?: (playback: RoomSessionPlayback) => unknown
  onRecordingStarted?: (recording: RoomSessionRecording) => unknown
  onRecordingUpdated?: (recording: RoomSessionRecording) => unknown
  onRecordingEnded?: (recording: RoomSessionRecording) => unknown
  onStreamStarted?: (stream: RoomSessionStream) => unknown
  onStreamEnded?: (stream: RoomSessionStream) => unknown
}

type MemberUpdatedEventMapping = {
  [K in MemberUpdatedEventNames]: K
}

export type RealtimeRoomListenersEventsMapping = Record<
  OnRoomSubscribed,
  RoomSubscribed
> &
  Record<OnRoomStarted, RoomStarted> &
  Record<OnRoomUpdated, RoomUpdated> &
  Record<OnRoomEnded, RoomEnded> &
  Record<OnRoomAudienceCount, RoomAudienceCount> &
  Record<OnLayoutChanged, VideoLayoutEventNames> &
  Record<OnMemberJoined, MemberJoined> &
  Record<OnMemberUpdated, MemberUpdated> &
  Record<OnMemberLeft, MemberLeft> &
  Record<OnMemberListUpdated, MemberListUpdated> &
  Record<OnMemberTalking, MemberTalking> &
  Record<OnMemberTalkingStarted, MemberTalkingStarted> &
  Record<OnMemberTalkingEnded, MemberTalkingEnded> &
  Record<OnMemberDeaf, MemberUpdatedEventMapping['member.updated.deaf']> &
  Record<OnMemberVisible, MemberUpdatedEventMapping['member.updated.visible']> &
  Record<
    OnMemberAudioMuted,
    MemberUpdatedEventMapping['member.updated.audioMuted']
  > &
  Record<
    OnMemberVideoMuted,
    MemberUpdatedEventMapping['member.updated.videoMuted']
  > &
  Record<
    OnMemberInputVolume,
    MemberUpdatedEventMapping['member.updated.inputVolume']
  > &
  Record<
    OnMemberOutputVolume,
    MemberUpdatedEventMapping['member.updated.outputVolume']
  > &
  Record<
    OnMemberInputSensitivity,
    MemberUpdatedEventMapping['member.updated.inputSensitivity']
  > &
  Record<OnPlaybackStarted, PlaybackStarted> &
  Record<OnPlaybackUpdated, PlaybackUpdated> &
  Record<OnPlaybackEnded, PlaybackEnded> &
  Record<OnRecordingStarted, RecordingStarted> &
  Record<OnRecordingUpdated, RecordingUpdated> &
  Record<OnRecordingEnded, RecordingEnded> &
  Record<OnStreamStarted, StreamStarted> &
  Record<OnStreamEnded, StreamEnded>

/**
 * RealTime Room CallPlayback API
 */
export type RealTimeRoomPlaybackEvents = Record<
  VideoPlaybackEventNames,
  (playback: RoomSessionPlayback) => void
>

export interface RealTimeRoomPlaybackListeners {
  onStarted?: (playback: RoomSessionPlayback) => unknown
  onUpdated?: (playback: RoomSessionPlayback) => unknown
  onEnded?: (playback: RoomSessionPlayback) => unknown
}

export type RealtimeRoomPlaybackListenersEventsMapping = Record<
  'onStarted',
  PlaybackStarted
> &
  Record<'onUpdated', PlaybackUpdated> &
  Record<'onEnded', PlaybackEnded>

/**
 * RealTime Room CallRecording API
 */
export type RealTimeRoomRecordingEvents = Record<
  VideoRecordingEventNames,
  (recording: RoomSessionRecording) => void
>
export interface RealTimeRoomRecordingListeners {
  onStarted?: (recording: RoomSessionRecording) => unknown
  onUpdated?: (recording: RoomSessionRecording) => unknown
  onEnded?: (recording: RoomSessionRecording) => unknown
}

export type RealtimeRoomRecordingListenersEventsMapping = Record<
  'onStarted',
  RecordingStarted
> &
  Record<'onUpdated', RecordingUpdated> &
  Record<'onEnded', RecordingEnded>

/**
 * RealTime Room CallStream API
 */
export type RealTimeRoomStreamEvents = Record<
  VideoStreamEventNames,
  (stream: RoomSessionStream) => void
>

export interface RealTimeRoomStreamListeners {
  onStarted?: (stream: RoomSessionStream) => unknown
  onEnded?: (stream: RoomSessionStream) => unknown
}

export type RealtimeRoomStreamListenersEventsMapping = Record<
  'onStarted',
  StreamStarted
> &
  Record<'onEnded', StreamEnded>
