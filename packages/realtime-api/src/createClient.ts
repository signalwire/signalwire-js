import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
  InternalUserOptions,
} from '@signalwire/core'
// import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { Session } from './Session'
// import { VideoObject } from './Video'

type CreateClientOptions = Omit<UserOptions, 'autoConnect'>

// interface IRealtimeClient extends Emitter<ClientEvents> {
//   video: VideoObject
//   connect: () => any
//   destroy: () => any
// }

// export interface RealtimeClient
//   extends StrictEventEmitter<Client, ClientEvents> {}
// export interface RealtimeClient
//   extends StrictEventEmitter<IRealtimeClient, ClientEvents> {}

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
