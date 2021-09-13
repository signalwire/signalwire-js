import { Rooms, extendComponent } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomDeviceMethods, RoomObjectEvents } from './utils/interfaces'

interface RoomDevice
  extends RoomDeviceMethods,
    BaseConnection<RoomObjectEvents> {
  join(): Promise<void>
  leave(): Promise<void>
}

class RoomDeviceConnection extends BaseConnection<RoomObjectEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

const RoomDevice = extendComponent<RoomDevice, RoomDeviceMethods>(
  RoomDeviceConnection,
  {
    audioMute: Rooms.audioMuteMember,
    audioUnmute: Rooms.audioUnmuteMember,
    videoMute: Rooms.videoMuteMember,
    videoUnmute: Rooms.videoUnmuteMember,
    setMicrophoneVolume: Rooms.setInputVolumeMember,
    setInputSensitivity: Rooms.setInputSensitivityMember,
  }
)

export { RoomDevice }
