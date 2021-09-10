import { Rooms, extendComponent } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomScreenShareMethods, RoomObjectEvents } from './utils/interfaces'

interface RoomScreenShare
  extends RoomScreenShareMethods,
    BaseConnection<RoomObjectEvents> {
  join(): Promise<void>
  leave(): Promise<void>
}

class RoomScreenShareConnection extends BaseConnection<RoomObjectEvents> {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

const RoomScreenShare = extendComponent<
  RoomScreenShare,
  RoomScreenShareMethods
>(RoomScreenShareConnection, {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setInputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
})

export { RoomScreenShare }
