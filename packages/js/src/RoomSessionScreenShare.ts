import {
  Rooms,
  extendComponent,
  BaseConnectionContract,
} from '@signalwire/core'
import {
  BaseConnection,
  BaseConnectionStateEventTypes,
} from '@signalwire/webrtc'
import { RoomScreenShareMethods } from './utils/interfaces'
import { RoomSessionScreenShareDocs } from './RoomSessionScreenShare.docs'

/** @deprecated Use {@link RoomSessionScreenShare} instead */
export interface RoomScreenShare extends RoomSessionScreenShare {}
interface RoomSessionScreenShareMain
  extends RoomScreenShareMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  join(): Promise<void>
  leave(): Promise<void>
}

/**
 * Represents a screen sharing.
 */
export interface RoomSessionScreenShare
  extends RoomSessionScreenShareDocs { }  // TODO: AssertSameType<RoomSessionScreenShareMain, RoomSessionScreenShareDocs>

export class RoomSessionScreenShareConnection extends BaseConnection<BaseConnectionStateEventTypes> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

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
