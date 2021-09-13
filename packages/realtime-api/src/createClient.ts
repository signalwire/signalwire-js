import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
  InternalUserOptions,
} from '@signalwire/core'
import { Client } from './Client'
import { Session } from './Session'

type CreateClientOptions = Omit<UserOptions, 'autoConnect'>

export const createClient = async (
  userOptions: CreateClientOptions
): Promise<Client> => {
  const baseUserOptions: InternalUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })

  const client = connect<ClientEvents, Client>({
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
