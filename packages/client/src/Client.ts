import { ConnectionOptions } from '@signalwire/webrtc'
import { CallParams } from './unified/interfaces'

export interface MakeRoomOptions extends CallParams, ConnectionOptions {
  /** Local media stream to override the local video and audio stream tracks */
  localStream?: MediaStream
}
