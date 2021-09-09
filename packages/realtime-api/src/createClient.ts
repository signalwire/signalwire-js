import {
  ClientEvents,
  configureStore,
  connect,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
// import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { Session } from './Session'
// import { VideoObject } from './Video'

type CreateClientOptions = Omit<UserOptions<ClientEvents>, 'autoConnect'>

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
  const baseUserOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(userOptions),
  }
  const store = configureStore({
    // @ts-expect-error
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })

  const client = connect({
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
