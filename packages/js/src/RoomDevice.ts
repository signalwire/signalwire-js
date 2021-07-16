import { Rooms } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomDeviceForComposition } from './utils/interfaces'

interface RoomDevice extends RoomDeviceForComposition {}

class RoomDevice extends BaseConnection {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

type RoomDeviceProps = {
  [k in keyof RoomDeviceForComposition]: PropertyDescriptor
}
const props: RoomDeviceProps = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
}
Object.defineProperties(RoomDevice.prototype, props)

export { RoomDevice }
