import {
  BaseClientOptions,
  ClientEvents,
  configureStore,
  getEventEmitter,
  UserOptions,
} from '@signalwire/core'
import StrictEventEmitter from 'strict-event-emitter-types'
import { Client } from './Client'
import { Session } from './Session'

export const createWebSocketClient = async (userOptions: UserOptions) => {
  const baseUserOptions: BaseClientOptions = {
    ...userOptions,
    emitter: getEventEmitter<ClientEvents>(userOptions),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })
  const client: StrictEventEmitter<Client, ClientEvents> = new Client(
    baseUserOptions,
    store
  )
  if (baseUserOptions.autoConnect) {
    await client.connect()
  }
  return client
}
