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

/** @internal */
export interface CreateClientOptions extends Omit<UserOptions, 'autoConnect'> {}
export type { RealtimeClient, ClientEvents }

/**
 * Creates a real-time Client.
 * @param userOptions
 * @param userOptions.project SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f`
 * @param userOptions.token SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9`
 * @param userOptions.contexts SignalWire Relay contexts, e.g `['default', 'my-context']`
 * @param userOptions.logLevel logging level
 * @returns an instance of a real-time Client.
 * 
 * @example
 * ```typescript
 * const client = await createClient({
 *   project: '<project-id>',
 *   token: '<project-token>'
 *   contexts: ['<your_contexts>']
 * })
 * ```
 */
export const createClient: (userOptions: {
  project?: string
  token: string
  contexts?: string[],
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
}) => Promise<RealtimeClient> =
// Note: types are inlined for clarity of documentation
async (userOptions) => {
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
