import type {
  Rooms,
  BaseConnectionState,
  VideoLayout,
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
  VideoRoomSessionContract,
  OnlyFunctionProperties,
  AssertSameType,
  MemberListUpdated,
  VideoPositions,
} from '@signalwire/core'
import { INTERNAL_MEMBER_UPDATABLE_PROPS } from '@signalwire/core'
import type { RoomSession } from '../RoomSession'
import type { RoomSessionDevice } from '../RoomSessionDevice'
import type { RoomSessionScreenShare } from '../RoomSessionScreenShare'
import { RoomMemberSelfMethodsInterfaceDocs } from './interfaces.docs'

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
  typeof INTERNAL_MEMBER_UPDATED_EVENTS[number]
/** @deprecated */
export type DeprecatedVideoMemberHandlerParams = {
  member: InternalVideoMemberEntity
}
export type VideoMemberHandlerParams = { member: VideoMemberEntity }
export type VideoMemberUpdatedHandlerParams = {
  member: VideoMemberEntityUpdated
}
export type VideoMemberListUpdatedParams = { members: VideoMemberEntity[] }

export type RoomSessionObjectEventsHandlerMap = Record<
  VideoLayoutEventNames,
  (params: { layout: VideoLayout }) => void
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
  Record<VideoRoomSessionEventNames, (params: VideoRoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<VideoRecordingEventNames, (recording: RoomSessionRecording) => void> &
  Record<VideoPlaybackEventNames, (recording: RoomSessionPlayback) => void> &
  Record<BaseConnectionState, (params: RoomSession) => void>

export type RoomSessionObjectEvents = {
  [k in keyof RoomSessionObjectEventsHandlerMap]: RoomSessionObjectEventsHandlerMap[k]
}

export type StartScreenShareOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
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

interface RoomMemberSelfMethodsInterface
  extends AssertSameType<
    {
      audioMute(): Rooms.AudioMuteMember
      audioUnmute(): Rooms.AudioUnmuteMember
      videoMute(): Rooms.VideoMuteMember
      videoUnmute(): Rooms.VideoUnmuteMember
      /**
       * @deprecated Use {@link setInputVolume} instead.
       * `setMicrophoneVolume` will be removed in v4.0.0
       */
      setMicrophoneVolume(params: {
        volume: number
      }): Rooms.SetInputVolumeMember
      setInputVolume(params: { volume: number }): Rooms.SetInputVolumeMember
      setInputSensitivity(params: {
        value: number
      }): Rooms.SetInputSensitivityMember
    },
    RoomMemberSelfMethodsInterfaceDocs
  > {}

/**
 * We are using these interfaces in combination of
 * Object.defineProperties() to avoid code duplication and
 * expose a nice documentation via TypeDoc. The interface
 * forces TS checking while Object.defineProperties allow us
 * flexibility across different objects.
 */
export interface RoomMethods
  extends OnlyFunctionProperties<VideoRoomSessionContract> {
  /** @deprecated Use {@link setVideoMuted} instead */
  hideVideoMuted(): Rooms.HideVideoMuted
  /** @deprecated Use {@link setVideoMuted} instead */
  showVideoMuted(): Rooms.ShowVideoMuted
}

export interface RoomSessionConnectionContract {
  screenShareList: RoomSessionScreenShare[]
  deviceList: RoomSessionDevice[]
  /** @deprecated Use {@link startScreenShare} instead. */
  createScreenShareObject(
    opts?: CreateScreenShareObjectOptions
  ): Promise<RoomSessionScreenShare>
  startScreenShare(
    opts?: StartScreenShareOptions
  ): Promise<RoomSessionScreenShare>
  addCamera(opts: AddCameraOptions): Promise<RoomSessionDevice>
  addMicrophone(opts: AddMicrophoneOptions): Promise<RoomSessionDevice>
  addDevice(opts: AddDeviceOptions): Promise<RoomSessionDevice>
  updateSpeaker(opts: { deviceId: string }): Promise<undefined>
}

export interface RoomSessionDeviceMethods
  extends RoomMemberSelfMethodsInterface {}

export interface RoomScreenShareMethods
  extends RoomMemberSelfMethodsInterface {}

export interface RoomSessionJoinAudienceParams {
  audio?: boolean
  video?: boolean
}
