import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  extendComponent,
  Rooms,
  VideoMemberContract,
  VideoMemberMethods,
} from '@signalwire/core'

export interface RoomSessionMemberAPI extends VideoMemberMethods {
  remove(): Rooms.RemoveMember
}

export interface RoomSessionMember extends VideoMemberContract {}

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
  VideoMemberMethods
>(RoomSessionMemberComponent, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setDeaf: Rooms.deafMember,
  setUndeaf: Rooms.undeafMember,
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
