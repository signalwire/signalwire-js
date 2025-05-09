import type {
  Rooms,
  VideoLayoutEventNames,
  VideoRoomSessionEventNames,
  VideoRoomEventParams,
  InternalVideoMemberEntity,
  InternalVideoMemberEntityUpdated,
  VideoMemberEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  RTCTrackEventName,
  InternalVideoMemberUpdatableProps,
  VideoRecordingEventNames,
  VideoPlaybackEventNames,
  RoomSessionRecording,
  RoomSessionPlayback,
  VideoRoomSessionContract as CoreVideoRoomSessionContract,
  OnlyFunctionProperties,
  MemberListUpdated,
  VideoPositions,
  RoomAudienceCount,
  VideoRoomAudienceCountEventParams,
  RoomLeft,
  RoomLeftEventParams,
  VideoStreamEventNames,
  RoomSessionStream,
  RoomJoined,
  RoomSubscribed,
  VideoRoomSubscribedEventParams,
  VideoAuthorization,
  VideoRoomDeviceUpdatedEventNames,
  DeviceUpdatedEventParams,
  VideoRoomDeviceDisconnectedEventNames,
  DeviceDisconnectedEventParams,
  VideoRoomDeviceEventNames,
  VideoLayoutChangedEventParams,
  VideoPosition,
  BaseConnectionState,
} from '@signalwire/core'
import { INTERNAL_MEMBER_UPDATABLE_PROPS } from '@signalwire/core'
import type { MediaEventNames } from '@signalwire/webrtc'
import type { RoomSessionDevice } from '../../RoomSessionDevice'
import type { RoomSessionScreenShare } from '../../RoomSessionScreenShare'
import { RoomSession } from '../../video/RoomSession'

/**
 * @privateRemarks
 * Every other package exposing a `VideoMemberEntity` is
 * transforming the server payload into something else, with
 * the most significant change being converting properties
 * from snake to camel case. The `js` package, on the other
 * hand, exposes the server payload pretty much as is (as of
 * v3) so what we consider internal (sdk and server) in
 * other packages is external (user facing) for `js`. Same
 * applies to `VideoMemberEntityUpdated` since it's just a
 * derived type.
 */
type VideoMemberEntity = InternalVideoMemberEntity
type VideoMemberEntityUpdated = InternalVideoMemberEntityUpdated

const INTERNAL_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${
    key as keyof InternalVideoMemberUpdatableProps
  }` as const
})
/** @deprecated */
export type DeprecatedMemberUpdatableProps =
  (typeof INTERNAL_MEMBER_UPDATED_EVENTS)[number]
/** @deprecated */
export type DeprecatedVideoMemberHandlerParams = {
  member: InternalVideoMemberEntity
}
export type VideoMemberHandlerParams = { member: VideoMemberEntity }
export type VideoMemberUpdatedHandlerParams = {
  member: VideoMemberEntityUpdated
  room_id?: string
  room_session_id?: string
}
export type VideoMemberListUpdatedParams = { members: VideoMemberEntity[] }

/**
 * List of all the events a RoomObject can listen to
 */
export type RoomEventNames =
  | VideoRoomSessionEventNames
  | VideoMemberEventNames
  | VideoLayoutEventNames
  | VideoRecordingEventNames
  | VideoPlaybackEventNames
  | VideoStreamEventNames
  | RTCTrackEventName

export type RoomSessionObjectEventsHandlerMap = Record<
  VideoRoomDeviceEventNames,
  (params: DeviceUpdatedEventParams) => void
> &
  Record<
    VideoLayoutEventNames,
    (params: VideoLayoutChangedEventParams) => void
  > &
  Record<
    Exclude<
      VideoMemberEventNames,
      MemberUpdated | MemberUpdatedEventNames | MemberListUpdated
    >,
    (params: VideoMemberHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (params: VideoMemberUpdatedHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberListUpdated>,
    (params: VideoMemberListUpdatedParams) => void
  > &
  Record<
    DeprecatedMemberUpdatableProps,
    (params: DeprecatedVideoMemberHandlerParams) => void
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
  Record<
    RoomAudienceCount,
    (params: VideoRoomAudienceCountEventParams) => void
  > &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<VideoRecordingEventNames, (recording: RoomSessionRecording) => void> &
  Record<VideoPlaybackEventNames, (recording: RoomSessionPlayback) => void> &
  Record<BaseConnectionState, (params: RoomSession) => void> &
  Record<VideoStreamEventNames, (stream: RoomSessionStream) => void>

// @deprecated Please use {@link VideoRoomSessionEvents}
export type RoomSessionObjectEvents = {
  [k in keyof RoomSessionObjectEventsHandlerMap]: RoomSessionObjectEventsHandlerMap[k]
}

export type VideoRoomSessionEvents = {
  [k in keyof RoomSessionObjectEventsHandlerMap]: RoomSessionObjectEventsHandlerMap[k]
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

/**
 * @deprecated Use {@link StartScreenShareOptions} instead.
 */
export interface CreateScreenShareObjectOptions
  extends StartScreenShareOptions {}

export type AddDeviceOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export type AddCameraOptions = MediaTrackConstraints & {
  autoJoin?: boolean
}
export type AddMicrophoneOptions = MediaTrackConstraints & {
  autoJoin?: boolean
}

export interface BaseRoomInterface {
  join(): Promise<unknown>
  leave(): Promise<unknown>
}

interface RoomMemberSelfMethodsInterface {
  /**
   * Puts the microphone on mute. The other participants will not hear audio
   * from the muted device anymore.
   *
   * @permissions
   *  - `room.self.audio_mute`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Muting the microphone:
   * ```typescript
   * await roomdevice.audioMute()
   * ```
   */
  audioMute(): Rooms.AudioMuteMember

  /**
   * Unmutes the microphone if it had been previously muted.
   *
   * @permissions
   *  - `room.self.audio_unmute`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
   *
   * @example Unmuting the microphone:
   * ```typescript
   * await roomdevice.audioUnmute()
   * ```
   */
  audioUnmute(): Rooms.AudioUnmuteMember

  /**
   * Puts the video on mute. Participants will see a mute image instead of the
   * video stream.
   *
   * @permissions
   *  - `room.self.video_mute`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
   * @permissions
   *  - `room.self.video_unmute`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
   * @permissions
   *  - `room.self.set_input_volume`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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
   * @permissions
   *  - `room.self.set_input_sensitivity`
   *
   * You need to specify the permissions when [creating the Video Room
   * Token](https://developer.signalwire.com/apis/reference/create_room_token)
   * on the server side.
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

/**
 * We are using these interfaces in combination of
 * Object.defineProperties() to avoid code duplication and
 * expose a nice documentation via TypeDoc. The interface
 * forces TS checking while Object.defineProperties allow us
 * flexibility across different objects.
 */
export interface VideoRoomSessionMethods
  extends OnlyFunctionProperties<CoreVideoRoomSessionContract> {
  /** @deprecated Use {@link setVideoMuted} instead */
  hideVideoMuted(): Rooms.HideVideoMuted
  /** @deprecated Use {@link setVideoMuted} instead */
  showVideoMuted(): Rooms.ShowVideoMuted
}

export interface VideoRoomSessionContract {
  deviceList: RoomSessionDevice[]
  interactivityMode: VideoAuthorization['join_as']
  permissions: VideoAuthorization['scopes']
  /** The `layout.changed` event based on the current room layout */
  currentLayoutEvent: VideoLayoutChangedEventParams
  /** The layout returned from the `layout.changed` event based on the current room layout */
  currentLayout: VideoLayoutChangedEventParams['layout']
  /** The current position of the member returned from the `layout.changed` event */
  currentPosition: VideoPosition | undefined
  /**
   * Joins the room session.
   */
  join(options?: BaseRoomSessionJoinParams): Promise<VideoRoomSessionContract>
  /**
   * Adds a screen sharing instance to the room. You can create multiple screen
   * sharing instances and add all of them to the room.
   * @param opts - {@link CreateScreenShareObjectOptions}
   * @returns - {@link RoomSessionScreenShare}
   *
   * @deprecated Use {@link startScreenShare} instead.
   */
  createScreenShareObject(
    opts?: CreateScreenShareObjectOptions
  ): Promise<RoomSessionScreenShare>
  /**
   * Adds a camera device to the room. Using this method, a user can stream
   * multiple video sources at the same time.
   *
   * @param opts - Specify the constraints for the device. In addition, you can
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later. {@link AddCameraOptions}
   * @returns - {@link RoomSessionDevice}
   *
   * @example Adding a specific camera:
   * ```typescript
   * await roomSession.addCamera({deviceId: "gOtMHwZdoA6wMlAnhbfTmeRgPAsqa7iw1OwgKYtbTLA="})
   * ```
   */
  addCamera(opts: AddCameraOptions): Promise<RoomSessionDevice>
  /**
   * Adds a microphone device to the room. Using this method, a user can stream
   * multiple video sources at the same time.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later. {@link AddMicrophoneOptions}
   * @returns - {@link RoomSessionDevice}
   *
   * @example Adding a specific microphone:
   * ```typescript
   * await roomSession.addMicrophone({deviceId: "PIn/IIDDgBUHzJkhRncv1m85hX1gC67xYIgJvvThB3Q="})
   * ```
   */
  addMicrophone(opts: AddMicrophoneOptions): Promise<RoomSessionDevice>
  /**
   * Adds a device to the room. Using this method, a user can stream multiple
   * sources at the same time. If you need to add a camera device or a
   * microphone device, you can alternatively use the more specific methods
   * {@link addCamera} and {@link addMicrophone}.
   *
   * @param opts Specify the constraints for the device. In addition, you can
   * add the `autoJoin` key to specify whether the device should immediately
   * join the room or joining will be performed manually later. {@link AddDeviceOptions}
   * @returns - {@link RoomSessionDevice}
   *
   * @example Adding any of the microphone devices to the room (duplicate
   * streams are possible):
   * ```typescript
   * await roomSession.addDevice({audio: true})
   * ```
   */
  addDevice(opts: AddDeviceOptions): Promise<RoomSessionDevice>
}

export interface RoomSessionDeviceMethods
  extends RoomMemberSelfMethodsInterface {}

export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface {}

export interface BaseRoomSessionJoinParams {
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
  receiveAudio?: boolean
  receiveVideo?: boolean
  sendAudio?: boolean
  sendVideo?: boolean
}

export type PagingCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

export type AudioElement = HTMLAudioElement & {
  sinkId?: string
  setSinkId?: (id: string) => Promise<void>
}
