import { uuid, logger, JWTSession, connect } from '@signalwire/core'
import * as webrtc from '@signalwire/webrtc'

export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    logger.warn(`Core feature ${uuid()}`)
    logger.info('WebRTC feature', webrtc.sum(a, b))
  }

  return a + b
}

class BaseWebRTCCall {
  id = uuid()

  constructor(public options: any) {}

  get store() {
    return this.options.store
  }

  onStateChange(component: any) {
    console.debug('Im onStateChange', component, this.id)
  }

  onRemoteSDP(component: any) {
    console.debug('Im onRemoteSDP', component, this.id)
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
