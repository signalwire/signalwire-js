import {
  getEventEmitter,
  InternalUserOptions,
  ClientEvents,
  configureStore,
  connect,
  UserOptions,
} from '@signalwire/core'
import { Session } from './Session'
import { Client, RealtimeClient } from './Client'

const CLIENTS_MAP: Map<string, RealtimeClient> = new Map()

const getClientKey = ({
  project,
  token,
}: {
  project?: string
  token: string
}) => {
  if (project) {
    return `${project}:${token}`
  }

  return token
}

const createClient = (userOptions: {
  project?: string
  token: string
  logLevel?: UserOptions['logLevel']
}) => {
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
    },
    sessionListeners: {
      authStatus: 'onAuth',
    },
  })(baseUserOptions)

  return client
}

const getToken = (userToken?: string) => {
  const token = userToken || process.env.SW_TOKEN

  if (!token) {
    // TODO: Add error message
    throw new Error('Missing token')
  }

  return token
}

export const getClient = (userOptions: {
  project?: string
  token?: string
  logLevel?: UserOptions['logLevel']
}): RealtimeClient => {
  const token = getToken(userOptions.token)
  const clientKey = getClientKey({
    project: userOptions.project,
    token,
  })

  if (CLIENTS_MAP.has(clientKey)) {
    // @ts-expect-error
    return CLIENTS_MAP.get(clientKey)
  } else {
    const client = createClient({
      ...userOptions,
      token,
    })

    CLIENTS_MAP.set(clientKey, client)

    return client
  }
}
