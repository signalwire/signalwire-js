import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
} from '@signalwire/core'
import {
  BaseConnection,
  BaseConnectionStateEventTypes,
} from '@signalwire/webrtc'
import { RoomDeviceMethods } from './utils/interfaces'

export interface RoomDevice
  extends RoomDeviceMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  join(): Promise<void>
  leave(): Promise<void>
}

export class RoomDeviceConnection extends BaseConnection<BaseConnectionStateEventTypes> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

const RoomDeviceAPI = extendComponent<RoomDeviceConnection, RoomDeviceMethods>(
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

export { RoomDeviceAPI }
