import { uuid, logger } from '@signalwire/core'
import * as webrtc from '@signalwire/webrtc'

export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    logger.info('Core feature', uuid())
    logger.info('WebRTC feature', webrtc.sum(a, b))
  }

  return a + b
}
