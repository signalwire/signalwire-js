import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  RoomEventNames,
  BaseConnectionState,
  EventsHandlerMapping,
} from '@signalwire/core'
import type { Room } from '../Room'
import type { RoomScreenShare } from '../RoomScreenShare'
import type { RoomDevice } from '../RoomDevice'

type BaseConnectionEventsHandlerMapping = EventsHandlerMapping &
  Record<BaseConnectionState, (params: Room) => void>

export type RoomObjectEvents = {
  [k in
    | RoomEventNames
    | BaseConnectionState]: BaseConnectionEventsHandlerMapping[k]
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

interface MemberCommandParams {
  memberId?: string
}
interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}

export interface BaseRoomInterface {
  join(): Promise<unknown>
  leave(): Promise<unknown>
}

interface RoomMemberMethodsInterface {
  audioMute(params: MemberCommandParams): Promise<unknown>
  audioUnmute(params: MemberCommandParams): Promise<unknown>
  videoMute(params: MemberCommandParams): Promise<unknown>
  videoUnmute(params: MemberCommandParams): Promise<unknown>
  setMicrophoneVolume(params: MemberCommandWithVolumeParams): Promise<unknown>
  setInputSensitivity(params: MemberCommandWithValueParams): Promise<unknown>
}

interface RoomMemberSelfMethodsInterface {
  audioMute(): Promise<unknown>
  audioUnmute(): Promise<unknown>
  videoMute(): Promise<unknown>
  videoUnmute(): Promise<unknown>
  setMicrophoneVolume(params: { volume: number }): Promise<unknown>
  setInputSensitivity(params: { value: number }): Promise<unknown>
}

interface RoomLayoutMethodsInterface {
  getLayoutList(): Promise<unknown>
  setLayout(params: { name: string }): Promise<unknown>
}

interface RoomControlMethodsInterface {
  getMemberList(): Promise<unknown>
  deaf(params: MemberCommandParams): Promise<unknown>
  undeaf(params: MemberCommandParams): Promise<unknown>
  setSpeakerVolume(params: MemberCommandWithVolumeParams): Promise<unknown>
  removeMember(params: Required<MemberCommandParams>): Promise<unknown>
  hideVideoMuted(): Promise<unknown>
  showVideoMuted(): Promise<unknown>
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
