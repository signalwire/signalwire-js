import {
  BaseComponent,
  BaseComponentOptions,
  Rooms,
  RoomCustomMethods,
  MemberUpdatedEventParams,
} from '@signalwire/core'

interface MemberOptions
  extends BaseComponentOptions,
    MemberUpdatedEventParams {}

// TODO: Interface for typedoc (?)
interface MemberMethods {}

class Member extends BaseComponent implements MemberMethods {
  constructor(public options: MemberOptions) {
    super(options)
  }

  // These are needed for the custom methods.
  roomSessionId = this.options.room_session_id
  memberId = this.options.member.id
}

const customMethods: RoomCustomMethods<any> = {
  // TODO: add remaining methods
  // TODO: implement `.remove()` on its own (?)
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  deaf: Rooms.deafMember,
  undeaf: Rooms.undeafMember,
}
Object.defineProperties(Member.prototype, customMethods)

export { Member }
