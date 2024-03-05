import { connect, ClientEvents, SDKStore } from '@signalwire/core'
import { setupInternals } from '../utils/internals'
import { Client } from './Client'

export const createClient = (userOptions: {
  project: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  store?: SDKStore
}) => {
  const { emitter, store } = setupInternals(userOptions)
  const client = connect<ClientEvents, Client, Client>({
    store: userOptions.store ?? store,
    Component: Client,
  })({ ...userOptions, store, emitter })

  return client
}
