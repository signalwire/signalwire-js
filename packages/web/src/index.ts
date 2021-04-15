import { uuid, logger, JWTSession, createSession } from '@signalwire/core'
import * as webrtc from '@signalwire/webrtc'

export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    logger.warn(`Core feature ${uuid()}`)
    logger.info('WebRTC feature', webrtc.sum(a, b))
  }

  return a + b
}

export { JWTSession, createSession }
