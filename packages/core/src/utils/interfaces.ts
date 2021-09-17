import type { EventEmitter } from '../utils/EventEmitter'
import { BaseSession } from '../BaseSession'
import { SDKStore } from '../redux'
import {
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
  PRODUCT_PREFIXES,
} from './constants'
import type { CustomSaga } from '../redux/interfaces'

type JSONRPCParams = Record<string, any>
type JSONRPCResult = Record<string, any>
type JSONRPCError = Record<string, any>

export type VertoMethod =
  | 'verto.invite'
  | 'verto.attach'
  | 'verto.answer'
  | 'verto.info'
  | 'verto.display'
  | 'verto.media'
  | 'verto.event'
  | 'verto.bye'
  | 'verto.punt'
  | 'verto.broadcast'
  | 'verto.subscribe'
  | 'verto.unsubscribe'
  | 'verto.clientReady'
  | 'verto.modify'
  | 'verto.mediaParams'
  | 'verto.prompt'
  | 'jsapi'
  | 'verto.stats'
  | 'verto.ping'
  | 'verto.announce'

export type JSONRPCMethod =
  | 'signalwire.connect'
  | 'signalwire.ping'
  | 'signalwire.disconnect'
  | 'signalwire.event'
  | 'signalwire.reauthenticate'
  | 'signalwire.subscribe'
  | 'video.message'
  | RoomMethod
  | VertoMethod

export interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string
  method: JSONRPCMethod
  params?: JSONRPCParams
}

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string
  result?: JSONRPCResult
  error?: JSONRPCError
}

export interface SessionOptions {
  /** @internal */
  host?: string
  /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
  project?: string
  /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
  token: string
  autoConnect?: boolean
  // From `LogLevelDesc` of loglevel to simplify our docs
  /** logging level */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
}

export interface UserOptions extends SessionOptions {
  /** @internal */
  devTools?: boolean
}

export interface InternalUserOptions extends UserOptions {
  /**
   * TODO: Create type containing all the possible types the
   * emitter should be allowed to handle
   */
  emitter: EventEmitter<any>
}

/**
 * `UserOptions` is exposed to the end user and `BaseClientOptions` is
 * the interface we use internally that extends the options provided.
 * @internal
 */
export interface BaseClientOptions<
  // TODO: review if having a default makes sense.
  EventTypes extends EventEmitter.ValidEventTypes = any
> extends UserOptions {
  store: SDKStore
  emitter: EventEmitter<EventTypes>
}

export interface BaseComponentOptions<
  EventTypes extends EventEmitter.ValidEventTypes
> {
  store: SDKStore
  emitter: EventEmitter<EventTypes>
  customSagas?: CustomSaga<any>[]
}

export interface SessionRequestObject {
  rpcRequest: JSONRPCRequest
  resolve: (value: unknown) => void
  reject: (value: unknown) => void
}

export interface SessionRequestQueued {
  resolve: (value: unknown) => void
  msg: JSONRPCRequest | JSONRPCResponse
}

interface Authorization {
  type: 'video'
  project: string
  scopes: string[]
  scope_id: string
  resource: string
  user_name: string
  room?: {
    name: string
    scopes: string[]
  }
  signature: string
  expires_at?: number
}

export interface RPCConnectResult {
  identity: string
  authorization: Authorization
  protocol: string
  ice_servers?: RTCIceServer[]
}

export type SessionConstructor = typeof BaseSession

export type SessionAuthStatus =
  | 'unknown'
  | 'authorizing'
  | 'authorized'
  | 'unauthorized'

export type SessionStatus =
  | 'unknown'
  | 'idle'
  | 'reconnecting'
  | 'connected'
  | 'disconnected'

export type SessionEvents = `session.${SessionStatus}`

/**
 * List of all the events the client can listen to.
 * @internal
 */
export type ClientEvents = Record<SessionEvents, () => void>

export type BaseConnectionState =
  | 'active'
  | 'answering'
  | 'destroy'
  | 'early'
  | 'hangup'
  | 'held'
  | 'new'
  | 'purge'
  | 'recovering'
  | 'requesting'
  | 'ringing'
  | 'trying'

export type SessionAuthError = {
  code: number
  error: string
}

/**
 * List of all Room methods
 */
export type RoomMethod =
  | 'video.list_available_layouts'
  | 'video.hide_video_muted'
  | 'video.show_video_muted'
  | 'video.members.get'
  | 'video.member.audio_mute'
  | 'video.member.audio_unmute'
  | 'video.member.video_mute'
  | 'video.member.video_unmute'
  | 'video.member.deaf'
  | 'video.member.undeaf'
  | 'video.member.set_input_volume'
  | 'video.member.set_output_volume'
  | 'video.member.set_input_sensitivity'
  | 'video.member.remove'
  | 'video.set_layout'
  | 'video.recording.list'
  | 'video.recording.start'
  | 'video.recording.stop'
  | 'video.recording.pause'
  | 'video.recording.resume'

export interface WebSocketClient {
  addEventListener: WebSocket['addEventListener']
  send: WebSocket['send']
  close: WebSocket['close']
  readyState: WebSocket['readyState']
}
export interface WebSocketAdapter {
  new (url: string, protocols?: string | string[]): WebSocketClient
}

export type ExecuteParams = {
  method: JSONRPCMethod
  params: Record<string, any>
}

export interface ExecuteExtendedOptions<InputType, OutputType> {
  transformResolve?: ExecuteTransform<InputType, OutputType>
  transformReject?: ExecuteTransform<InputType, OutputType>
}

export type ExecuteTransform<InputType = unknown, OutputType = unknown> = (
  payload: InputType
) => OutputType

export type APIMethodsMap<T> = {
  [k in keyof T]: PropertyDescriptor
}

export type RoomCustomMethods<T> = APIMethodsMap<T>

export type EventsPrefix = '' | typeof PRODUCT_PREFIXES[number]
/**
 * See {@link GLOBAL_VIDEO_EVENTS} for the full list of events.
 */
export type GlobalVideoEvents = typeof GLOBAL_VIDEO_EVENTS[number]
export type InternalGlobalVideoEvents =
  typeof INTERNAL_GLOBAL_VIDEO_EVENTS[number]

/**
 * `EventTransform`s represent our internal pipeline for
 * creating specific instances for each event handler. This
 * is basically what let us create and pass a `Member`
 * object for the `member.x` event handler.
 *
 * Each class extending from `BaseComponent` has the ability
 * to define a `getEmitterTransforms` method. That method
 * will let us specify a set of methods (defined by the
 * `EventTransform` interface) for defining how we want to
 * handle certain events.
 *
 * Internally, the pipeline looks as follows:
 * 1. We create and cache the instance using
 *    `instanceFactory`. You could think of this object as a
 *    set of methods with no state. It's important to note
 *    that `instanceFactory` **must** return an stateless
 *    object. If for some reason you have to have some state
 *    on the instance make sure those values are static.
 * 2. Every time we get an event from the server, we grab
 *    its payload, and combine the stateless object we
 *    created with `instanceFactory` with that payload
 *    (through a Proxy) to create a unique **stateful**
 *    object. This will be the instance the end user will be
 *    interacting with.
 *
 * The easiest way to think about this is that the payload
 * sent by the server is our **state**, while the object
 * created using `instanceFactory` is the **behavior**.
 *
 * Proxy
 * ┌───────────────────────────────────┐
 * │┼─────────────────────────────────┼│
 * ││            payload              ││
 * │┼─────────────────────────────────┼│
 * │┼─────────────────────────────────┼│
 * ││   object (from instanceFactory) ││
 * │┼─────────────────────────────────┼│
 * └───────────────────────────────────┘
 */
export interface EventTransform {
  /**
   * Must return an **stateless** object. Think of it as a
   * set of APIs representing the behavior you want to
   * expose to the end user.
   */
  instanceFactory: (payload: any) => any
  /**
   * Allow us to transform the payload sent by the server.
   *
   * It's important to note that the `payload` **is your
   * only state**, so if you try to access something using
   * `this` you'll get only to static properties or methods
   * defined by the object returned from `instanceFactory`.
   */
  payloadTransform: (payload: any) => any
  /**
   * Allow us to define what property to use to namespace
   * our events (_eventsNamespace).
   */
  getInstanceEventNamespace?: (payload: any) => string
  /**
   * Allow us to define the `event_channel` for the Proxy.
   */
  getInstanceEventChannel?: (payload: any) => string
}

export type BaseEventHandler = (...args: any[]) => void
