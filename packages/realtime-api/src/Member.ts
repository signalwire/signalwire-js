import {
  BaseComponent,
  BaseComponentOptions,
  Rooms,
  RoomCustomMethods,
  MemberEventParams,
} from '@signalwire/core'

interface MemberOptions extends BaseComponentOptions {
  params: MemberEventParams
}

interface MemberMethods {
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

  /** @internal */
  removeMember(params: { memberId: string }): Rooms.RemoveMember
}

interface Member extends MemberMethods {
  // TODO: expand the public interface
  visible: boolean
}

class Member extends BaseComponent {
  constructor(public options: MemberOptions) {
    super(options)
  }

  // These are needed for the custom methods.
  roomSessionId = this.options.params.room_session_id
  memberId = this.options.params.member.id

  remove() {
    // Alias to removeMember forcing `memberId`
    return this.removeMember({ memberId: this.memberId })
  }
}

const customMethods: RoomCustomMethods<MemberMethods> = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setSpeakerVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
  removeMember: Rooms.removeMember,
}
Object.defineProperties(Member.prototype, customMethods)

export { Member }
