import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
  BaseConnectionState,
  RoomLeft,
} from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomSessionDeviceMethods } from './utils/interfaces'

type RoomSessionDeviceEventsHandlerMap = Record<
  BaseConnectionState,
  (params: RoomSessionDevice) => void
> &
  Record<RoomLeft, (params: void) => void>

export type RoomSessionDeviceEvents = {
  [k in keyof RoomSessionDeviceEventsHandlerMap]: RoomSessionDeviceEventsHandlerMap[k]
}

/** @deprecated Use {@link RoomSessionDevice} instead */
export interface RoomDevice extends RoomSessionDevice {}
export interface RoomSessionDevice
  extends RoomSessionDeviceMethods,
    BaseConnectionContract<RoomSessionDeviceEvents> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<RoomSessionDeviceEvents>['runWorker']
}

export class RoomSessionDeviceConnection extends BaseConnection<RoomSessionDeviceEvents> {
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
