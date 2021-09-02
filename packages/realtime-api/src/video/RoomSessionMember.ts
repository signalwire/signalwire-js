import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  Rooms,
  RoomCustomMethods,
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

// FIXME: extends VideoMember properties too
export interface RoomSessionMember extends RoomSessionMemberMethods {
  remove(): Rooms.RemoveMember
}

// FIXME: Using `Partial` because of defineProperties
export class RoomSessionMemberAPI
  extends BaseComponent
  implements Partial<RoomSessionMember>
{
  async remove() {
    await this.execute({
      method: 'video.member.remove',
      params: {
        // TODO: use `getParam`
        // room_session_id: this.getParam('roomSessionId'),
        // member_id: this.getParam('id'),
      },
    })
  }
}

const customMethods: RoomCustomMethods<RoomSessionMemberMethods> = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
}
Object.defineProperties(RoomSessionMemberAPI.prototype, customMethods)

export const createRoomSessionMemberObject = (params: BaseComponentOptions) => {
  const member: RoomSessionMemberAPI = connect({
    store: params.store,
    Component: RoomSessionMemberAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return member
}
