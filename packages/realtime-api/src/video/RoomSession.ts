import {
  connect,
  BaseComponentOptions,
  Rooms,
  RoomCustomMethods,
  EventTransform,
  toExternalJSON,
  VideoMemberEventParams,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
} from '@signalwire/core'
import { BaseConsumer } from '../BaseConsumer'
import { createRoomSessionMemberObject } from './RoomSessionMember'

// FIXME: Move these interfaces to core (and use them in JS too)
export interface MemberCommandParams {
  memberId?: string
}
export interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
export interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}

interface RoomSessionMethods {
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
  getMembers(): Rooms.GetMembers
  deaf(params: MemberCommandParams): Rooms.DeafMember
  undeaf(params: MemberCommandParams): Rooms.UndeafMember
  setSpeakerVolume(
    params: MemberCommandWithVolumeParams
  ): Rooms.SetOutputVolumeMember
  removeMember(params: Required<MemberCommandParams>): Rooms.RemoveMember
  hideVideoMuted(): Rooms.HideVideoMuted
  showVideoMuted(): Rooms.ShowVideoMuted
  getLayouts(): Rooms.GetLayouts
  setLayout(): Rooms.SetLayout
}

// FIXME: extends VideoRoom properties too
interface RoomSession extends RoomSessionMethods {}

type MemberEventMap =
  | InternalVideoMemberEventNames
  | InternalVideoMemberEventNames[]

/**
 * FIXME: extends BaseConsumer without an `options.namespace`
 * for the _attachListeners
 */
// FIXME: Using `Partial` because of defineProperties
export class RoomSessionAPI
  extends BaseConsumer
  implements Partial<RoomSession>
{
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<MemberEventMap, EventTransform>([
      [
        [
          'video.member.joined',
          'video.member.left',
          'video.member.talking',
          'video.member.talking.start',
          'video.member.talking.stop',
          'video.member.updated',
          ...INTERNAL_MEMBER_UPDATED_EVENTS,
        ],
        {
          instanceFactory: (_payload: VideoMemberEventParams) => {
            return createRoomSessionMemberObject({
              store: this.store,
              emitter: this.options.emitter,
            })
          },
          payloadTransform: (payload: VideoMemberEventParams) => {
            return toExternalJSON(payload.member)
          },
        },
      ],
    ])
  }
}

const customMethods: RoomCustomMethods<RoomSessionMethods> = {
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  getMembers: Rooms.getMembers,
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
  hideVideoMuted: Rooms.hideVideoMuted,
  showVideoMuted: Rooms.showVideoMuted,
  getLayouts: Rooms.getLayouts,
  setLayout: Rooms.setLayout,
}
Object.defineProperties(RoomSessionAPI.prototype, customMethods)

export const createRoomSessionObject = (params: BaseComponentOptions) => {
  const roomSession: RoomSessionAPI = connect({
    store: params.store,
    Component: RoomSessionAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return roomSession
}
