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
  AssertSameType,
} from '@signalwire/core'
import { INTERNAL_MEMBER_UPDATABLE_PROPS } from '@signalwire/core'
import type { RoomSession } from '../RoomSession'
import {
  RoomMemberMethodsInterfaceDocs,
  RoomControlMethodsInterfaceDocs,
  RoomMemberSelfMethodsInterfaceDocs,
} from './interfaces.docs'

const INTERNAL_MEMBER_UPDATED_EVENTS = Object.keys(
  INTERNAL_MEMBER_UPDATABLE_PROPS
).map((key) => {
  return `member.updated.${key as keyof InternalVideoMemberUpdatableProps
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
  extends StartScreenShareOptions { }

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

interface RoomMemberMethodsInterfaceMain {
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

type RoomMemberMethodsInterface = AssertSameType<RoomMemberMethodsInterfaceMain, RoomMemberMethodsInterfaceDocs>

interface RoomMemberSelfMethodsInterfaceMain {
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

type RoomMemberSelfMethodsInterface = AssertSameType<RoomMemberSelfMethodsInterfaceMain, RoomMemberSelfMethodsInterfaceDocs>

interface RoomLayoutMethodsInterface {
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
   * // returns:
   * {
   *   "layouts": [
   *     "8x8", "2x1", "1x1", "5up", "5x5",
   *     "4x4", "10x10", "2x2", "6x6", "3x3",
   *     "grid-responsive", "highlight-1-responsive"
   *   ]
   * }
   * ```
   */
  getLayouts(): Rooms.GetLayouts

  /**
   * Sets a layout for the room. You can obtain a list of available layouts
   * with {@link getLayouts}.
   * @param params 
   * @param params.name name of the layout
   * 
   * @permissions
   *  - `room.set_layout`
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
  setLayout(params: { name: string }): Rooms.SetLayout
}

interface RoomControlMethodsInterfaceMain {
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

type RoomControlMethodsInterface = AssertSameType<RoomControlMethodsInterfaceMain, RoomControlMethodsInterfaceDocs>

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
  RoomControlMethodsInterface { }

export interface RoomSessionDeviceMethods
  extends RoomMemberSelfMethodsInterface { }

export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface { }
