import { uuid, logger, connect, JWTSession } from '@signalwire/core'
import * as webrtc from '@signalwire/webrtc'

export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    logger.warn(`Core feature ${uuid()}`)
    logger.info('WebRTC feature', webrtc.sum(a, b))
  }

  return a + b
}

const BaseWebRTCCall = (store: any) => (userOptions: any) => {
  console.debug('BaseWebRTCCall userOptions', store, userOptions)
  const id = uuid()

  return {
    id,
    onStateChange: (component: any) => {
      console.debug('Im onStateChange', component, id)
    },
    onRemoteSDP: (component: any) => {
      console.debug('Im onRemoteSDP', component, id)
    },
  }
}

const ConnectedWebRTCCall = connect(
  {
    onStateChangeListeners: {
      state: 'onStateChange',
      remoteSDP: 'onRemoteSDP',
    },
  },
  BaseWebRTCCall
)

export const createWebRTCCall = (userOptions: any) => {
  // const session = getSession()
  // console.debug('createWebRTCCall', session)
  console.debug('createWebRTCCall')

  return ConnectedWebRTCCall(userOptions)
}

export { JWTSession }
