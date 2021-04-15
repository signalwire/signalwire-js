import { uuid, logger } from './utils'
import { Session } from './Session'
import { JWTSession } from './JWTSession'
import { configureStore, connect } from './redux'
import { SignalWire } from './SignalWire'

// prettier-ignore
export {
  uuid,
  logger,
  Session,
  JWTSession,
  connect,
  configureStore
}

export * from './RPCMessages'

export const createSession = (userOptions: any) => {
  return new Promise((resolve, _reject) => {
    const store = configureStore()
    const client = new SignalWire(userOptions, store)
    if (userOptions.autoConnect) {
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
