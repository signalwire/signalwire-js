import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
  BaseConnectionState,
  RoomLeft,
} from '@signalwire/core'
import { BaseConnection, MediaEvent } from '@signalwire/webrtc'
import { RoomScreenShareMethods } from './utils/interfaces'

type RoomSessionScreenShareEventsHandlerMap = Record<
  BaseConnectionState,
  (params: RoomSessionScreenShare) => void
> &
  Record<RoomLeft, (params: void) => void> &
  Record<MediaEvent, () => void>

export type RoomSessionScreenShareEvents = {
  [k in keyof RoomSessionScreenShareEventsHandlerMap]: RoomSessionScreenShareEventsHandlerMap[k]
}

/** @deprecated Use {@link RoomSessionScreenShare} instead */
export interface RoomScreenShare extends RoomSessionScreenShare {}
export interface RoomSessionScreenShare
  extends RoomScreenShareMethods,
    BaseConnectionContract<RoomSessionScreenShareEvents> {
  join(): Promise<void>
  leave(): Promise<void>
  /** @internal */
  runWorker: BaseConnection<RoomSessionScreenShareEvents>['runWorker']
}

export class RoomSessionScreenShareConnection extends BaseConnection<RoomSessionScreenShareEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

/**
 * Represents a screen sharing.
 */
export const RoomSessionScreenShareAPI = extendComponent<
  RoomSessionScreenShareConnection,
  RoomScreenShareMethods
>(RoomSessionScreenShareConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
