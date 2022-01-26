import {
  ClientEvents,
  configureStore,
  connect,
  EventEmitter,
  UserOptions,
} from '@signalwire/core'
import { Client, RealtimeClient } from './Client'

const CLIENTS_MAP: Map<string, RealtimeClient> = new Map()

export const getClientKey = ({
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
    },
  })(userOptions)

  return client
}

export const getClient = ({
  cache = CLIENTS_MAP,
  ...userOptions
}: {
  project: string
  token: string
  logLevel?: UserOptions['logLevel']
  store: ReturnType<typeof configureStore>
  emitter: EventEmitter
  cache?: Map<string, RealtimeClient>
}): RealtimeClient => {
  const clientKey = getClientKey({
    project: userOptions.project,
    token: userOptions.token,
  })

  if (cache.has(clientKey)) {
    // @ts-expect-error
    return cache.get(clientKey)
  } else {
    const client = createClient(userOptions)

    cache.set(clientKey, client)

    return client
  }
}
