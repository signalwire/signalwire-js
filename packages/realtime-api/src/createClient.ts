import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
  InternalUserOptions,
} from '@signalwire/core'
import { Client, RealtimeClient } from './Client'
import { Session } from './Session'

export interface CreateClientOptions extends Omit<UserOptions, 'autoConnect'> {}
export type { RealtimeClient, ClientEvents }

export const createClient = async (
  userOptions: CreateClientOptions
): Promise<RealtimeClient> => {
  const baseUserOptions: InternalUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })

  const client = connect<ClientEvents, Client, RealtimeClient>({
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
