import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  extendComponent,
  Rooms,
  VideoMember,
} from '@signalwire/core'

export interface RoomSessionMemberMethods {
  audioMute(): Rooms.AudioMuteMember
  audioUnmute(): Rooms.AudioUnmuteMember
  videoMute(): Rooms.VideoMuteMember
  videoUnmute(): Rooms.VideoUnmuteMember
  deaf(): Rooms.DeafMember
  undeaf(): Rooms.UndeafMember
  setMicrophoneVolume(params: { volume: number }): Rooms.SetInputVolumeMember
  setSpeakerVolume(params: { volume: number }): Rooms.SetOutputVolumeMember
  setInputSensitivity(params: {
    value: number
  }): Rooms.SetInputSensitivityMember
}

export interface RoomSessionMemberAPI extends RoomSessionMemberMethods {
  remove(): Rooms.RemoveMember
}

export type RoomSessionMember = RoomSessionMemberAPI & VideoMember

// TODO: Extend from a variant of `BaseComponent` that
// doesn't expose EventEmitter methods
class RoomSessionMemberComponent extends BaseComponent<{}> {
  async remove() {
    await this.execute({
      method: 'video.member.remove',
      params: {
        room_session_id: this.getStateProperty('roomSessionId'),
        member_id: this.getStateProperty('memberId'),
      },
    })
  }
}

const RoomSessionMemberAPI = extendComponent<
  RoomSessionMember,
  RoomSessionMemberMethods
>(RoomSessionMemberComponent, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})

export const createRoomSessionMemberObject = (
  params: BaseComponentOptions<{}>
) => {
  const member = connect({
    store: params.store,
    // @ts-expect-error
    Component: RoomSessionMemberAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return member as any as RoomSessionMember
}
