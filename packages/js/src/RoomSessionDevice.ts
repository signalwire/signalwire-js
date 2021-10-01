import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
} from '@signalwire/core'
import {
  BaseConnection,
  BaseConnectionStateEventTypes,
} from '@signalwire/webrtc'
import { RoomSessionDeviceMethods } from './utils/interfaces'

/** @deprecated Use {@link RoomSessionDevice} instead */
export type RoomDevice = RoomSessionDevice
export interface RoomSessionDevice
  extends RoomSessionDeviceMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  join(): Promise<void>
  leave(): Promise<void>
}

export class RoomSessionDeviceConnection extends BaseConnection<BaseConnectionStateEventTypes> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

export const RoomSessionDeviceAPI = extendComponent<
  RoomSessionDeviceConnection,
  RoomSessionDeviceMethods
>(RoomSessionDeviceConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
