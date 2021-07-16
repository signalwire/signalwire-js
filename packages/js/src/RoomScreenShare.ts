import { Rooms, RoomCustomMethods } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomScreenShareMethods } from './utils/interfaces'

interface RoomScreenShare extends RoomScreenShareMethods {}

class RoomScreenShare extends BaseConnection {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

const customMethods: RoomCustomMethods<RoomScreenShareMethods> = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
}
Object.defineProperties(RoomScreenShare.prototype, customMethods)

export { RoomScreenShare }
