import type {
  Rooms,
  BaseConnectionState,
  VideoLayout,
  VideoLayoutEventNames,
  VideoRoomSessionEventNames,
  VideoRoomEventParams,
  VideoMemberEntity,
  InternalVideoMemberEntity,
  VideoMemberEventNames,
  MemberUpdated,
  MemberUpdatedEventNames,
  MemberTalkingEventNames,
  VideoMemberEntityUpdated,
  VideoMemberTalkingEventParams,
  RTCTrackEventName,
  InternalVideoMemberUpdatableProps,
  VideoRecordingEventNames,
  RoomSessionRecording,
} from '@signalwire/core'
import { INTERNAL_MEMBER_UPDATABLE_PROPS } from '@signalwire/core'
import type { RoomSession } from '../RoomSession'

const INTERNAL_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${
    key as keyof InternalVideoMemberUpdatableProps
  }` as const
})
/** @deprecated */
export type DeprecatedMemberUpdatableProps =
  typeof INTERNAL_MEMBER_UPDATED_EVENTS[number]
/** @deprecated */
export type DeprecatedVideoMemberHandlerParams = {
  member: InternalVideoMemberEntity
}
export type VideoMemberHandlerParams = { member: VideoMemberEntity }
export type VideoMemberUpdatedHandlerParams = {
  member: VideoMemberEntityUpdated
}

export type RoomSessionObjectEventsHandlerMap = Record<
  VideoLayoutEventNames,
  (params: { layout: VideoLayout }) => void
> &
  Record<
    Exclude<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (params: VideoMemberHandlerParams) => void
  > &
  Record<
    Extract<VideoMemberEventNames, MemberUpdated | MemberUpdatedEventNames>,
    (params: VideoMemberUpdatedHandlerParams) => void
  > &
  Record<
    DeprecatedMemberUpdatableProps,
    (params: DeprecatedVideoMemberHandlerParams) => void
  > &
  Record<
    MemberTalkingEventNames,
    (params: VideoMemberTalkingEventParams) => void
  > &
  Record<VideoRoomSessionEventNames, (params: VideoRoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<VideoRecordingEventNames, (recording: RoomSessionRecording) => void> &
  Record<BaseConnectionState, (params: RoomSession) => void>

export type RoomSessionObjectEvents = {
  [k in keyof RoomSessionObjectEventsHandlerMap]: RoomSessionObjectEventsHandlerMap[k]
}

export type StartScreenShareOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
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

export interface MemberCommandParams {
  memberId?: string
}
export interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
export interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}

export interface BaseRoomInterface {
  join(): Promise<unknown>
  leave(): Promise<unknown>
}

interface RoomMemberMethodsInterface {
  audioMute(params?: MemberCommandParams): Rooms.AudioMuteMember
  audioUnmute(params?: MemberCommandParams): Rooms.AudioUnmuteMember
  videoMute(params?: MemberCommandParams): Rooms.VideoMuteMember
  videoUnmute(params?: MemberCommandParams): Rooms.VideoUnmuteMember
  setInputVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetInputVolumeMember
  /**
   * @deprecated Use {@link setInputVolume} instead.
   * `setMicrophoneVolume` will be removed in v4.0.0
   */
  setMicrophoneVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetInputVolumeMember
  setInputSensitivity(
    params: MemberCommandWithValueParams
  ): Rooms.SetInputSensitivityMember
}

interface RoomMemberSelfMethodsInterface {
  audioMute(): Rooms.AudioMuteMember
  audioUnmute(): Rooms.AudioUnmuteMember
  videoMute(): Rooms.VideoMuteMember
  videoUnmute(): Rooms.VideoUnmuteMember
  /**
   * @deprecated Use {@link setInputVolume} instead.
   * `setMicrophoneVolume` will be removed in v4.0.0
   */
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember
  setInputVolume(params: { volume: number }): Rooms.SetInputVolumeMember
  setInputSensitivity(params: {
    value: number
  }): Rooms.SetInputSensitivityMember
}

interface RoomLayoutMethodsInterface {
  getLayouts(): Rooms.GetLayouts
  setLayout(params: { name: string }): Rooms.SetLayout
}

interface RoomControlMethodsInterface {
  getMembers(): Rooms.GetMembers
  deaf(params?: MemberCommandParams): Rooms.DeafMember
  undeaf(params?: MemberCommandParams): Rooms.UndeafMember
  setOutputVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetOutputVolumeMember
  /**
   * @deprecated Use {@link setOutputVolume} instead.
   * `setSpeakerVolume` will be removed in v4.0.0
   */
  setSpeakerVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetOutputVolumeMember
  removeMember(params: Required<MemberCommandParams>): Rooms.RemoveMember
  hideVideoMuted(): Rooms.HideVideoMuted
  showVideoMuted(): Rooms.ShowVideoMuted
  getRecordings(): Rooms.GetRecordings
  startRecording(): Promise<Rooms.RoomSessionRecording>
}

/**
 * We are using these interfaces in
 * combination of Object.defineProperties()
 * to avoid code duplication and expose a
 * nice documentation via TypeDoc.
 * The interface forces TS checking
 * while Object.defineProperties allow us
 * flexibility across different objects.
 */
export interface RoomMethods
  extends RoomMemberMethodsInterface,
    RoomLayoutMethodsInterface,
    RoomControlMethodsInterface {}

export interface RoomSessionDeviceMethods
  extends RoomMemberSelfMethodsInterface {}

export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface {}
