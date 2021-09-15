import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  extendComponent,
  Rooms,
  VideoMemberContract,
  VideoMemberMethods,
  EntityUpdated,
} from '@signalwire/core'

export interface RoomSessionMember extends VideoMemberContract {}
export type RoomSessionMemberUpdated = EntityUpdated<RoomSessionMember>

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
  RoomSessionMemberComponent,
  // `remove` is defined by `RoomSessionMemberComponent`
  Omit<VideoMemberMethods, 'remove'>
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
): RoomSessionMember => {
  const member = connect<{}, RoomSessionMemberComponent, RoomSessionMember>({
    store: params.store,
    Component: RoomSessionMemberAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return member
}
