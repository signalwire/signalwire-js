import { ConnectionOptions } from '@signalwire/webrtc'

// Basic call parameters interface
interface CallParams {
  token: string  // Made required to match SessionOptions
  rootElement?: HTMLElement | string
}

export interface MakeRoomOptions extends CallParams, ConnectionOptions {
  /** Local media stream to override the local video and audio stream tracks */
  localStream?: MediaStream
}
