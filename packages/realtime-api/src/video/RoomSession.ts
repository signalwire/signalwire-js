import {
  BaseComponentOptions,
  connect,
  EventTransform,
  extendComponent,
  InternalVideoMemberEventNames,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  Rooms,
  toExternalJSON,
  VideoMemberEventParams,
  InternalVideoRoomEventNames,
  VideoRoomUpdatedEventParams,
  InternalVideoLayoutEventNames,
  VideoLayoutChangedEventParams,
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

type EmitterTransformsEvents =
  | InternalVideoRoomEventNames
  | InternalVideoMemberEventNames
  | InternalVideoLayoutEventNames

// TODO: update once we do the split between API and Entity interfaces
export interface RoomSession
  extends RoomSessionMethods,
    BaseConsumer<MemberEventMap> {}

class RoomSessionConsumer extends BaseConsumer<MemberEventMap> {
  protected _eventsPrefix = 'video' as const

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<
      EmitterTransformsEvents | EmitterTransformsEvents[],
      EventTransform
    >([
      [
        'video.room.updated',
        {
          instanceFactory: () => {
            return this
          },
          payloadTransform: (payload: VideoRoomUpdatedEventParams) => {
            return toExternalJSON(payload.room)
          },
          getInstanceEventNamespace: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room_session_id
          },
          getInstanceEventChannel: (payload: VideoRoomUpdatedEventParams) => {
            return payload.room.event_channel
          },
        },
      ],
      [
        'video.layout.changed',
        {
          instanceFactory: () => {
            // TODO: Implement a Layout object when we have a better payload
            // from the backend
            return {}
          },
          payloadTransform: (payload: VideoLayoutChangedEventParams) => {
            return toExternalJSON(payload.layout)
          },
        },
      ],
      [
        [
          'video.member.joined',
          'video.member.left',
          'video.member.talking',
          'video.member.talking.start',
          'video.member.talking.started',
          'video.member.talking.stop',
          'video.member.talking.ended',
          'video.member.updated',
          ...INTERNAL_MEMBER_UPDATED_EVENTS,
        ],
        {
          instanceFactory: (_payload: VideoMemberEventParams) => {
            return createRoomSessionMemberObject({
              store: this.store,
              // @ts-expect-error
              emitter: this.options.emitter,
            })
          },
          payloadTransform: (payload: VideoMemberEventParams) => {
            const { id, ...rest } = payload.member
            return toExternalJSON({
              ...rest,
              /**
               * The server is sending the member id as `id`
               * but internally (i.e in CustomMethods) we
               * reference it as `memberId`. This is needed
               * because sometimes we have to deal with
               * multiple ids at once and having them
               * properly prefixed makes it easier to read.
               */
              member_id: id,
            })
          },
        },
      ],
    ])
  }
}

export const RoomSessionAPI = extendComponent<RoomSession, RoomSessionMethods>(
  RoomSessionConsumer,
  {
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
)

export const createRoomSessionObject = (
  params: BaseComponentOptions<MemberEventMap>
) => {
  const roomSession = connect({
    store: params.store,
    // @ts-expect-error
    Component: RoomSessionAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return roomSession as any as RoomSession
}
