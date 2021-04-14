import { connect } from '@signalwire/core'
import { BaseCall } from './BaseCall'

class Call extends BaseCall {
  desktopOnlyMethod() {
    console.debug('Desktop Method')
  }
}

export const createWebRTCCall = async (userOptions: any) => {
  const session = await createSession(userOptions)
  console.debug('createWebRTCCall', session)

  // return ReduxConnectedCall(userOptions)
  return connect(
    {
      store: session.store,
      onStateChangeListeners: {
        state: 'onStateChange',
        remoteSDP: 'onRemoteSDP',
      },
    },
    Call
  )(userOptions)
}
