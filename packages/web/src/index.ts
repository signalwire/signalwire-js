import {
  JWTSession,
  SignalWire,
  configureStore,
  connect,
  UserOptions,
  EventPubSub,
} from '@signalwire/core'
import { Call } from '@signalwire/webrtc'

export { JWTSession }

class Client extends SignalWire {
  get rooms() {
    return {
      // TODO: use CallOptions interface here
      makeCall: (options: any) => {
        return connect({
          store: this.store,
          Component: Call,
          onStateChangeListeners: {
            state: 'onStateChange',
            remoteSDP: 'onRemoteSDP',
            errors: 'onError',
            responses: 'onSuccess',
          },
        })(options)
      },
    }
  }
}

export const createSession = (userOptions: UserOptions) => {
  return new Promise((resolve, _reject) => {
    const baseUserOptions: UserOptions = {
      ...userOptions,
      pubSub: userOptions.pubSub || EventPubSub(),
    }
    const store = configureStore({ userOptions: baseUserOptions })
    const client = new Client(baseUserOptions, store)
    if (baseUserOptions.autoConnect) {
      store.subscribe(() => {
        const state = store.getState()
        // @ts-ignore
        if (state?.STORE_READY) {
          resolve(client)
        }
      })

      client.connect()
      // Fake the redux subscribe above for now
      setTimeout(() => {
        resolve(client)
      }, 2000)
      // store.dispatch(initSessionAction(userOptions))
    } else {
      resolve(client)
    }
  })
}
