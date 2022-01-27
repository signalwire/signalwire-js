import {
  ClientEvents,
  configureStore,
  connect,
  EventEmitter,
  UserOptions,
} from '@signalwire/core'
import { Client, RealtimeClient } from './Client'

const CLIENTS_MAP: Map<string, RealtimeClient> = new Map()

const getClientKey = ({
  project,
  token,
}: {
  project: string
  token: string
}) => {
  return `${project}:${token}`
}

const createClient = (userOptions: {
  project: string
  token: string
  logLevel?: UserOptions['logLevel']
  store: ReturnType<typeof configureStore>
  emitter: EventEmitter
}) => {
  const client = connect<ClientEvents, Client, RealtimeClient>({
    store: userOptions.store,
    Component: Client,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    }
  })(userOptions)

  return client
}

export const getClient = (userOptions: {
  project: string
  token: string
  logLevel?: UserOptions['logLevel']
  store: ReturnType<typeof configureStore>
  emitter: EventEmitter
}): RealtimeClient => {
  const clientKey = getClientKey({
    project: userOptions.project,
    token: userOptions.token,
  })

  if (CLIENTS_MAP.has(clientKey)) {
    // @ts-expect-error
    return CLIENTS_MAP.get(clientKey)
  } else {
    const client = createClient(userOptions)

    CLIENTS_MAP.set(clientKey, client)

    return client
  }
}
