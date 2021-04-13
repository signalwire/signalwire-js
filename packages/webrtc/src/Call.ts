import { connect } from '@signalwire/core'
import { BaseCall } from './BaseCall'

class Call extends BaseCall {
  desktopOnlyMethod() {
    console.debug('Desktop Method')
  }
}

const ReduxConnectedCall = connect(
  {
    onStateChangeListeners: {
      state: 'onStateChange',
      remoteSDP: 'onRemoteSDP',
    },
  },
  Call
)

export const createWebRTCCall = (userOptions: any) => {
  // const session = getSession()
  // console.debug('createWebRTCCall', session)
  console.debug('createWebRTCCall')

  return ReduxConnectedCall(userOptions)
}
