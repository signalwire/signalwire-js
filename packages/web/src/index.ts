import {
  uuid,
  logger,
  JWTSession,
  connect,
  configureStore,
  createSession,
} from '@signalwire/core'
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

  connect() {
    this.store.dispatch({
      type: 'INIT_SESSION',
      payload: {
        token: '<token>',
      },
    })
  }

  onStateChange(component: any) {
    console.debug('Im onStateChange', component, this.id)
  }

  onRemoteSDP(component: any) {
    console.debug('Im onRemoteSDP', component, this.id)
  }
}

export const createWebRTCCall = (userOptions: any) => {
  // const session = getSession()
  // console.debug('createWebRTCCall', session)
  console.debug('createWebRTCCall')
  const store = configureStore()

  return connect({
    store,
    Component: BaseWebRTCCall,
    onStateChangeListeners: {
      state: 'onStateChange',
      remoteSDP: 'onRemoteSDP',
    },
  })(userOptions)
}

export { JWTSession, createSession }
