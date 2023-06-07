import { connect, ClientEvents } from '@signalwire/core'
import { setupInternals } from '../../utils/internals'
import { Client } from '../../client/Client'

export const createClient = (userOptions: {
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
}) => {
  const { emitter, store } = setupInternals(userOptions)
  const client = connect<ClientEvents, Client, Client>({
    store,
    Component: Client,
  })({ ...userOptions, store, emitter })

  return client
}
