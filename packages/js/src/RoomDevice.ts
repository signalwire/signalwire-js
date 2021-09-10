import { Rooms, RoomCustomMethods } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomDeviceMethods, RoomObjectEvents } from './utils/interfaces'

interface RoomDevice extends RoomDeviceMethods {}

class RoomDevice extends BaseConnection<RoomObjectEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

const customMethods: RoomCustomMethods<RoomDeviceMethods> = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
}
Object.defineProperties(RoomDevice.prototype, customMethods)

export { RoomDevice }
