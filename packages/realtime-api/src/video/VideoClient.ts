import {
  AssertSameType,
  getEventEmitter,
  InternalUserOptions,
  UserOptions,
  ClientEvents,
  configureStore,
  connect,
} from '@signalwire/core'
import { Session } from '../Session'
import { Client, RealtimeClient } from '../Client'
import { RealTimeVideoApiEvents } from '../types'

export interface VideoClientApiEvents extends RealTimeVideoApiEvents {}

export interface VideoApiFullState extends VideoClient {}
interface VideoClientMain extends RealtimeClient {}

interface VideoClientDocs extends VideoClientMain {}

export interface VideoClient
  extends AssertSameType<VideoClientMain, VideoClientDocs> {}

export interface VideoClientOptions extends UserOptions {}

const createClient = (userOptions: {
  project?: string
  token: string
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
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

const VideoClient = function (options: VideoClientOptions) {
  const client = createClient(options)

  const on: RealtimeClient['on'] = (...args) => {
    client.connect()

    return client.on(...args)
  }

  // TODO: intercept other methods.

  return new Proxy<VideoClient>(client, {
    get(target: VideoClient, prop: keyof VideoClient, receiver: any) {
      if (prop === 'on') {
        return on
      }

      return Reflect.get(target, prop, receiver)
    },
  })
  // For consistency with other constructors we'll make TS force the use of `new`
} as unknown as { new (options: VideoClientOptions): VideoClient }

export default VideoClient
