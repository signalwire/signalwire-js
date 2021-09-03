import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  Rooms,
  BaseConnectionState,
  VideoLayout,
  VideoLayoutEventNames,
  VideoRoomEventNames,
  VideoRoomEventParams,
  VideoMember,
  InternalVideoMember,
  VideoMemberEventNames,
  MemberTalkingEventNames,
  VideoMemberTalkingEventParams,
  RTCTrackEventName,
  InternalVideoMemberUpdatableProps,
  VideoRecordingEventNames,
  RoomSessionRecording,
} from '@signalwire/core'
import { INTERNAL_MEMBER_UPDATABLE_PROPS } from '@signalwire/core'
import type { Room } from '../Room'
import type { RoomScreenShare } from '../RoomScreenShare'
import type { RoomDevice } from '../RoomDevice'

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
export type DeprecatedVideoMemberHandlerParams = { member: InternalVideoMember }
export type VideoMemberHandlerParams = { member: VideoMember }

export type RoomObjectEventsHandlerMap = Record<
  VideoLayoutEventNames,
  (params: { layout: VideoLayout }) => void
> &
  Record<VideoMemberEventNames, (params: VideoMemberHandlerParams) => void> &
  Record<
    DeprecatedMemberUpdatableProps,
    (params: DeprecatedVideoMemberHandlerParams) => void
  > &
  Record<
    MemberTalkingEventNames,
    (params: VideoMemberTalkingEventParams) => void
  > &
  Record<VideoRoomEventNames, (params: VideoRoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<BaseConnectionState, (params: Room) => void> &
  Record<VideoRecordingEventNames, (recording: RoomSessionRecording) => void>

export type RoomObjectEvents = {
  [k in keyof RoomObjectEventsHandlerMap]: RoomObjectEventsHandlerMap[k]
}

export type RoomObject = StrictEventEmitter<Room, RoomObjectEvents>
export type RoomScreenShareObject = StrictEventEmitter<
  RoomScreenShare,
  RoomObjectEvents
>
export type RoomDeviceObject = StrictEventEmitter<RoomDevice, RoomObjectEvents>

export type CreateScreenShareObjectOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

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
  audioMute(params: MemberCommandParams): Rooms.AudioMuteMember
  audioUnmute(params: MemberCommandParams): Rooms.AudioUnmuteMember
  videoMute(params: MemberCommandParams): Rooms.VideoMuteMember
  videoUnmute(params: MemberCommandParams): Rooms.VideoUnmuteMember
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
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember
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
  deaf(params: MemberCommandParams): Rooms.DeafMember
  undeaf(params: MemberCommandParams): Rooms.UndeafMember
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

export interface RoomDeviceMethods extends RoomMemberSelfMethodsInterface {}

export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface {}
