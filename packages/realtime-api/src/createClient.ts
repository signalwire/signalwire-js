import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { Session } from './Session'

type CreateClientOptions = Omit<UserOptions, 'autoConnect'>

export const createClient = async (userOptions: CreateClientOptions) => {
  const baseUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(userOptions),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })

  const client: StrictEventEmitter<Client, ClientEvents> = connect({
    store,
    Component: Client,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
      id: 'onClientSubscribed',
    },
    sessionListeners: {
      authStatus: 'onAuth',
    },
  })(baseUserOptions)

  return client
}
