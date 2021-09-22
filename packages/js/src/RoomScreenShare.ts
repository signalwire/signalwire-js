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

export interface RoomScreenShare
  extends RoomScreenShareMethods,
    BaseConnectionContract<BaseConnectionStateEventTypes> {
  join(): Promise<void>
  leave(): Promise<void>
}

export class RoomScreenShareConnection extends BaseConnection<BaseConnectionStateEventTypes> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

export const RoomScreenShareAPI = extendComponent<
  RoomScreenShareConnection,
  RoomScreenShareMethods
>(RoomScreenShareConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})
