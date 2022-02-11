import {
  configureStore,
  EventEmitter,
  getLogger,
  UserOptions,
} from '@signalwire/core'
import { clientProxyFactory } from './clientProxyFactory'
import { getClient } from './getClient'

export const getProxiedClient = (userOptions: {
  project: string
  token: string
  contexts?: string[]
  logLevel?: UserOptions['logLevel']
  store: ReturnType<typeof configureStore>
  emitter: EventEmitter
}) => {
  const client = getClient(userOptions)

  client.on('session.auth_error', () => {
    getLogger().error("Wrong credentials: couldn't connect the client.")

    // TODO: we can execute the future `onConnectError` from here.
  })

  return clientProxyFactory(client)
}
