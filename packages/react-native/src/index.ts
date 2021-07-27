import { uuid, logger } from '@signalwire/core'

export const RNTest = () => {
  logger.warn('Hello from RN', uuid())
  console.log('Hello from RN 2', uuid())
}

export * from '@signalwire/webrtc'
