import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
  RoomLeft,
  RoomLeftEventParams,
  BaseConnectionState,
} from '@signalwire/core'
import { BaseConnection, MediaEventNames } from '@signalwire/webrtc'
import { CallSessionDeviceMethods } from './utils/interfaces'

type CallSessionDeviceEventsHandlerMap = Record<
  BaseConnectionState,
  (params: CallSessionDevice) => void
> &
  Record<RoomLeft, (params?: RoomLeftEventParams) => void> &
  Record<MediaEventNames, () => void>

export type CallSessionDeviceEvents = {
  [k in keyof CallSessionDeviceEventsHandlerMap]: CallSessionDeviceEventsHandlerMap[k]
}

/** @deprecated Use {@link CallSessionDevice} instead */
export interface CallDevice extends CallSessionDevice {}
export interface CallSessionDevice
  extends CallSessionDeviceMethods,
    BaseConnectionContract<CallSessionDeviceEvents> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<CallSessionDeviceEvents>['runWorker']
}

export class CallSessionDeviceConnection extends BaseConnection<CallSessionDeviceEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

/**
 * A CallSessionDevice represents a device (such as a microphone or a camera)
 * that is at some point in its lifetime part of a {@link RoomSession}. You can
 * obtain a CallSessionDevice from the {@link RoomSession} methods
 * {@link RoomSession.addCamera}, {@link RoomSession.addMicrophone}, and
 * {@link RoomSession.addDevice}.
 */
export const CallSessionDeviceAPI = extendComponent<
  CallSessionDeviceConnection,
  CallSessionDeviceMethods
>(CallSessionDeviceConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
