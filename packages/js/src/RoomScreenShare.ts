import { Rooms } from '@signalwire/core'
import { BaseConnection } from '@signalwire/webrtc'
import { RoomScreenShareForComposition } from './utils/interfaces'

interface RoomScreenShare extends RoomScreenShareForComposition {}

class RoomScreenShare extends BaseConnection {
  join() {
    return super.invite()
  }

  leave() {
    return super.hangup()
  }
}

type RoomScreenShareProps = {
  [k in keyof RoomScreenShareForComposition]: PropertyDescriptor
}
const props: RoomScreenShareProps = {
  audioMute: Rooms.audioMuteMember,
  audioUnmute: Rooms.audioUnmuteMember,
  videoMute: Rooms.videoMuteMember,
  videoUnmute: Rooms.videoUnmuteMember,
  setMicrophoneVolume: Rooms.setOutputVolumeMember,
  setInputSensitivity: Rooms.setInputSensitivityMember,
}
Object.defineProperties(RoomScreenShare.prototype, props)

export { RoomScreenShare }
