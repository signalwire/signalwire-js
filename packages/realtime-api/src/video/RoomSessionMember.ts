import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  Rooms,
  VideoMember,
} from '@signalwire/core'
import { extendComponent } from '../extendComponent'

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

export interface RoomSessionMemberAPI
  extends RoomSessionMemberMethods,
    BaseComponent {
  remove(): Rooms.RemoveMember
}

export type RoomSessionMember = RoomSessionMemberAPI & VideoMember

class RoomSessionMemberComponent extends BaseComponent {
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

export const createRoomSessionMemberObject = (params: BaseComponentOptions) => {
  const member: RoomSessionMember = connect({
    store: params.store,
    Component: RoomSessionMemberAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return member
}
