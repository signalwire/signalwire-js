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
export interface RoomDevice extends RoomSessionDevice {}
export interface RoomSessionDevice
  extends RoomSessionDeviceMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<BaseConnectionStateEventTypes>['runWorker']
}

export class RoomSessionDeviceConnection extends BaseConnection<BaseConnectionStateEventTypes> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

/**
 * A RoomSessionDevice represents a device (such as a microphone or a camera)
 * that is at some point in its lifetime part of a {@link RoomSession}. You can
 * obtain a RoomSessionDevice from the {@link RoomSession} methods
 * {@link RoomSession.addCamera}, {@link RoomSession.addMicrophone}, and
 * {@link RoomSession.addDevice}.
 */
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
