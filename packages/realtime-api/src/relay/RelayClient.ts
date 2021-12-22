import {
  connect,
  configureStore,
  getEventEmitter,
  InternalUserOptions,
  BaseClient,
  BaseClientOptions,
  UserOptions,
  ClientContract,
  ClientEvents,
  SessionState,
} from '@signalwire/core'
import { Session } from '../Session'
import { createTaskingObject, Tasking } from './tasking/Tasking'
// import { Messaging } from './Messaging'
// import { Calling } from './Calling'

type RelayClientEvents = ClientEvents &
  Record<'signalwire.ready', (client: RelayClient) => void>

export interface RelayClient
  extends ClientContract<RelayClient, RelayClientEvents> {
  tasking: Tasking
}

export interface RelayClientOptions extends UserOptions {
  contexts: string[]
}

class RelayClientAPI extends BaseClient<RelayClientEvents> {
  // private _calling: Calling = null
  private _tasking: Tasking
  // private _messaging: Messaging = null

  constructor(options: BaseClientOptions<RelayClientEvents>) {
    super(options)

    this._attachSignals()
  }

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this.emit('signalwire.ready')
    } else if (session.authStatus === 'unauthorized') {
      this._detachSignals()
    }
  }

  // get calling(): Calling {
  //   if (!this._calling) {
  //     this._calling = new Calling(this)
  //   }
  //   return this._calling
  // }

  get tasking(): Tasking {
    if (this._tasking) {
      return this._tasking
    }
    this._tasking = createTaskingObject({
      store: this.store,
      // Emitter is now typed but we share it across objects
      // so types won't match
      // @ts-expect-error
      emitter: this.options.emitter,
    })
    return this._tasking
  }

  // get messaging(): Messaging {
  //   if (!this._messaging) {
  //     this._messaging = new Messaging(this)
  //   }
  //   return this._messaging
  // }

  // TODO: Review teardown process
  private _gracefulDisconnect(signal: string) {
    this.logger.info(`Received ${signal} - Disconnecting...`)
    this.disconnect()
  }

  private _attachSignals() {
    process.on('SIGTERM', this._gracefulDisconnect)
    process.on('SIGINT', this._gracefulDisconnect)
  }

  private _detachSignals() {
    process.off('SIGTERM', this._gracefulDisconnect)
    process.off('SIGINT', this._gracefulDisconnect)
  }
}

// FIXME: reuse `createClient` instead ?
export const RelayClient = function (options: RelayClientOptions) {
  const baseUserOptions: InternalUserOptions = {
    ...options,
    emitter: getEventEmitter<RelayClientEvents>(),
  }
  const store = configureStore({
    userOptions: baseUserOptions,
    SessionConstructor: Session,
  })

  const client = connect<RelayClientEvents, RelayClientAPI, RelayClient>({
    store,
    Component: RelayClientAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
    sessionListeners: {
      authStatus: 'onAuth',
    },
  })(baseUserOptions)

  return client

  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: RelayClientOptions): RelayClient }
