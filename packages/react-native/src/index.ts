import { uuid, getLogger } from '@signalwire/core'
import * as webrtc from '@signalwire/webrtc'

export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    getLogger().info('Core feature', uuid())
    getLogger().info('WebRTC feature', webrtc)
  }

  return a + b
}
