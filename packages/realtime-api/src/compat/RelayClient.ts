import type {
  UserOptions,
  BaseClientOptions,
  ClientEvents,
  ClientContract,
  BaseComponentOptions,
  SessionState,
  SDKWorker,
  ExecuteExtendedOptions,
} from '@signalwire/core'
import { connect, selectors, BaseClient } from '@signalwire/core'
import { getProxiedClient, clientConnect } from '../client/index'
import { getCredentials, setupInternals } from '../utils/internals'
import { Calling } from './Calling'
import { Messaging } from './Messaging'
import { Tasking } from './Tasking'
import { relayWorker } from './workers'

type RelayClientEvents = ClientEvents &
  Record<'signalwire.ready', (client: RelayClient) => void>

export interface RelayClient
  extends ClientContract<RelayClient, RelayClientEvents> {
  calling: Calling
  messaging: Messaging
  tasking: Tasking
}

export interface RelayClientOptions extends UserOptions {
  contexts: string[]
}

class RelayClientAPI extends BaseClient<RelayClientEvents> {
  private _calling: Calling
  private _messaging: Messaging
  private _tasking: Tasking

  constructor(options: BaseClientOptions<RelayClientEvents>) {
    super(options)

    this._attachSignals()
    this.attachWorkers()
  }

  protected override getWorkers(): Map<string, { worker: SDKWorker<any> }> {
    return new Map([['relay', { worker: relayWorker }]])
  }

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this.emit('signalwire.ready')
    } else if (session.authStatus === 'unauthorized') {
      this._detachSignals()
    }
  }

  override execute<
    InputType = unknown,
    OutputType = unknown,
    ParamsType = Record<string, any>
  >(
    msg: any,
    options: ExecuteExtendedOptions<InputType, OutputType, ParamsType>
  ): Promise<OutputType> {
    const { method, params } = msg.request.params
    return super.execute({ method, params }, options)
  }

  get relayProtocol(): string {
    return this.select(selectors.getProtocol)
  }

  get calling(): Calling {
    if (!this._calling) {
      this._calling = new Calling(this, {
        store: this.store,
        emitter: this.emitter,
      })
    }
    return this._calling
  }

  get tasking(): Tasking {
    if (!this._tasking) {
      this._tasking = new Tasking(this, {
        store: this.store,
        emitter: this.emitter,
      })
    }
    return this._tasking
  }

  get messaging(): Messaging {
    if (!this._messaging) {
      this._messaging = new Messaging(this, {
        store: this.store,
        emitter: this.emitter,
      })
    }
    return this._messaging
  }

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

/** @internal */
export const createRelayObject = (
  params: BaseComponentOptions<RelayClientEvents>
): RelayClient => {
  const client = connect<RelayClientEvents, RelayClientAPI, RelayClient>({
    store: params.store,
    Component: RelayClientAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  const proxy = new Proxy<RelayClient>(client, {
    get(target: any, prop: any, receiver: any) {
      if (prop === '_eventsNamespace') {
        /**
         * Events at this level will always be global so
         * there's no need for a namespace.
         */
        return ''
      } else if (prop === 'eventChannel') {
        // FIXME:
        return 'video.rooms'
      }

      return Reflect.get(target, prop, receiver)
    },
  })

  return proxy
}

export const RelayClient = function (options: RelayClientOptions) {
  const credentials = getCredentials({
    token: options.token,
    project: options.project,
  })
  const { emitter, store } = setupInternals({
    ...options,
    ...credentials,
  })
  const client = getProxiedClient({
    ...options,
    ...credentials,
    emitter,
    store,
  })

  const relay = createRelayObject({
    store,
    emitter,
  })

  const interceptors: { on: RelayClient['on']; once: RelayClient['once'] } = {
    on: (...args) => {
      clientConnect(client)

      return relay.on(...args)
    },
    once: (...args) => {
      clientConnect(client)

      return relay.once(...args)
    },
  }

  // client.on('session.connected', async () => {
  //   getLogger().info('w000t connected!')
  // })

  return new Proxy<RelayClient>(relay, {
    get(target: RelayClient, prop: keyof RelayClient, receiver: any) {
      if (prop in interceptors) {
        // @ts-expect-error
        return interceptors[prop]
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: RelayClientOptions): RelayClient }
