import type { SagaIterator } from '@redux-saga/types'
import { BaseSession } from '../BaseSession'
import { SDKStore } from '../redux'
import {
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
  PRODUCT_PREFIXES,
} from './constants'
import type {
  CustomSaga,
  SessionChannel,
  SwEventChannel,
} from '../redux/interfaces'
import type { URL as NodeURL } from 'node:url'
import {
  AllOrNone,
  ChatJSONRPCMethod,
  MessagingJSONRPCMethod,
  VoiceCallMethod,
  ClientContextMethod,
} from '..'

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
  | 'verto.pong'
  | 'verto.announce'

export type WebRTCMethod = 'video.message' | 'webrtc.verto'
export type SubscriberMethod = 'subscriber.online' | 'subscriber.offline'
export type JSONRPCMethod =
  | 'signalwire.connect'
  | 'signalwire.ping'
  | 'signalwire.disconnect'
  | 'signalwire.event'
  | 'signalwire.reauthenticate'
  | 'signalwire.subscribe'
  | 'signalwire.unsubscribe'
  | SubscriberMethod
  | WebRTCMethod
  | RoomMethod
  | FabricMethod
  | VertoMethod
  | ChatJSONRPCMethod
  | MessagingJSONRPCMethod
  | VoiceCallMethod
  | ClientContextMethod

export type JSONRPCSubscribeMethod = Extract<
  JSONRPCMethod,
  'signalwire.subscribe' | 'chat.subscribe'
>

export type JSONRPCUnSubscribeMethod = Extract<
  JSONRPCMethod,
  'signalwire.unsubscribe'
>

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

export interface BaseRPCResult extends Record<string, unknown> {
  code: string
  message: string
}

export interface SessionOptions {
  /** @internal */
  host?: string
  /** SignalWire project id, e.g. `a10d8a9f-2166-4e82-56ff-118bc3a4840f` */
  project?: string
  /** SignalWire project token, e.g. `PT9e5660c101cd140a1c93a0197640a369cf5f16975a0079c9` */
  token: string
  /** SignalWire contexts, e.g. 'home', 'office'.. */
  contexts?: string[]
  /** An alias for contexts - Topics has more priority over contexts */
  topics?: string[]
  // From `LogLevelDesc` of loglevel to simplify our docs
  /** logging level */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
  /** Callback invoked by the SDK to fetch a new token for re-authentication */
  onRefreshToken?(): Promise<string>
  sessionChannel?: SessionChannel
  instanceMap?: InstanceMap
}

export interface UserOptions extends SessionOptions {
  /** @internal */
  devTools?: boolean
  /** @internal */
  debug?: {
    logWsTraffic?: boolean
  }
  /** @internal */
  logger?: SDKLogger
}

export interface InternalUserOptions extends UserOptions {
  workers?: SDKWorker<any>[]
}

/**
 * `UserOptions` is exposed to the end user and `BaseClientOptions` is
 * the interface we use internally that extends the options provided.
 * @internal
 */
export interface BaseClientOptions extends UserOptions {
  store: SDKStore
}

export interface BaseComponentOptions {
  store: SDKStore
  customSagas?: CustomSaga<any>[]
}

export interface BaseComponentOptionsWithPayload<
  CustomPayload extends unknown
> {
  store: SDKStore
  customSagas?: CustomSaga<any>[]
  payload: CustomPayload
}

export interface SessionRequestObject {
  rpcRequest: JSONRPCRequest
  resolve: (value: unknown) => void
  reject: (value: unknown) => void
}

export type MediaAllowed = 'all' | 'audio-only' | 'video-only'
type MediaDirectionAllowed = 'none' | 'receive' | 'both'
type AudioAllowed = MediaDirectionAllowed
type VideoAllowed = MediaDirectionAllowed

export type VideoMeta = Record<string, any>
export interface VideoAuthorization {
  type: 'video'
  project: string
  project_id: string
  scopes: string[]
  scope_id: string
  resource: string
  join_as: 'member' | 'audience'
  user_name: string
  room?: {
    name: string
    display_name: string
    scopes: string[]
    meta: VideoMeta
  }
  signature: string
  expires_at?: number
  media_allowed?: MediaAllowed
  audio_allowed: AudioAllowed
  video_allowed: VideoAllowed
  meta: VideoMeta
}

export type ChatAuthorizationChannels = Record<
  string,
  { read?: boolean; write?: boolean }
>

export interface ChatAuthorization {
  type: 'chat'
  channels: ChatAuthorizationChannels
  expires_at: number
  member_id: string
  project: string
  project_id: string
  resource: string
  scope_id: string
  scopes: string[]
  signature: string
  space_id: string
  ttl: number
}

export interface SATAuthorization {
  jti: string
  project_id: string
  fabric_subscriber: {
    // TODO: public ?
    version: number
    expires_at: number
    subscriber_id: string
    application_id: string
    project_id: string
    space_id: string
  }
}

export type JWTAuthorization = VideoAuthorization | ChatAuthorization

export type Authorization = JWTAuthorization | SATAuthorization

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
  | 'disconnecting'
  | 'disconnected'
  | 'auth_error'
  | 'expiring'

export type SessionEvents = `session.${SessionStatus}`

export type SessionActions = 'session.forceClose'

/**
 * List of all the events the client can listen to.
 * @internal
 */
export type ClientEvents = Record<SessionEvents, (params?: any) => void>

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
  message: string
}

/**
 * List of all Room methods
 */
export type RoomMethod =
  | 'video.room.get'
  | 'video.rooms.get'
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
  | 'video.member.set_position'
  | 'video.member.remove'
  | 'video.member.get_meta'
  | 'video.member.set_meta'
  | 'video.member.update_meta'
  | 'video.member.delete_meta'
  | 'video.get_meta'
  | 'video.set_meta'
  | 'video.update_meta'
  | 'video.delete_meta'
  | 'video.set_layout'
  | 'video.set_position'
  | 'video.recording.list'
  | 'video.recording.start'
  | 'video.recording.stop'
  | 'video.recording.pause'
  | 'video.recording.resume'
  | 'video.playback.list'
  | 'video.playback.start'
  | 'video.playback.pause'
  | 'video.playback.resume'
  | 'video.playback.stop'
  | 'video.playback.set_volume'
  | 'video.playback.seek_absolute'
  | 'video.playback.seek_relative'
  | 'video.member.demote'
  | 'video.member.promote'
  | 'video.stream.list'
  | 'video.stream.start'
  | 'video.stream.stop'
  | 'video.lock'
  | 'video.unlock'
  | 'video.member.raisehand'
  | 'video.member.lowerhand'
  | 'video.prioritize_handraise'

/**
 * List of all Call Fabric methods
 */
export type FabricMethod =
  | 'call.mute'
  | 'call.unmute'
  | 'call.deaf'
  | 'call.undeaf'
  | 'call.layout.list'
  | 'call.member.list'
  | 'call.member.remove'
  | 'call.member.position.set'
  | 'call.layout.set'
  | 'call.microphone.volume.set'
  | 'call.microphone.sensitivity.set'
  | 'call.speaker.volume.set'
  | 'call.lock'
  | 'call.unlock'
  | 'call.raisehand'
  | 'call.lowerhand'
  | 'call.audioflags.set'

export interface WebSocketClient {
  addEventListener: WebSocket['addEventListener']
  removeEventListener: WebSocket['removeEventListener']
  send: WebSocket['send']
  close: WebSocket['close']
  readyState: WebSocket['readyState']
}

export interface NodeSocketClient extends WebSocketClient {
  addEventListener(
    method: 'open' | 'close' | 'error' | 'message',
    cb: (event: any) => void,
    options?: any
  ): void
  removeEventListener(
    method: 'open' | 'close' | 'error' | 'message',
    cb: (event: any) => void
  ): void
  send(data: any, cb?: (err?: Error) => void): void
}

/**
 * There's a difference in `searchParams` between URL from
 * `lib` and URL from `url` (node) that makes using the same
 * not possible for us.
 */
export interface NodeSocketAdapter {
  new (address: string | NodeURL, options?: any): NodeSocketClient
  new (
    address: string | NodeURL,
    protocols?: string | string[],
    options?: any
  ): NodeSocketClient
}
export interface WebSocketAdapter {
  new (url: string | URL, protocols?: string | string[]): WebSocketClient
}

export type ExecuteParams = {
  method: JSONRPCMethod
  params: Record<string, any>
}

export interface ExecuteExtendedOptions<InputType, OutputType, ParamsType> {
  /** To transform the resolved response */
  transformResolve?: ExecuteTransform<InputType, OutputType>
  /** To transform the rejected response */
  transformReject?: ExecuteTransform<InputType, OutputType>
  /** To transform the RPC execute params */
  transformParams?: ExecuteTransform<ParamsType, ExecuteParams['params']>
}

export type ExecuteTransform<InputType = unknown, OutputType = unknown> = (
  payload: InputType
) => OutputType

export type APIMethodsMap<T> = {
  [k in keyof T]: PropertyDescriptor
}

export type RoomCustomMethods<T> = APIMethodsMap<T>

export type EventsPrefix = '' | (typeof PRODUCT_PREFIXES)[number]
/**
 * See {@link GLOBAL_VIDEO_EVENTS} for the full list of events.
 */
export type GlobalVideoEvents = (typeof GLOBAL_VIDEO_EVENTS)[number]
export type InternalGlobalVideoEvents =
  (typeof INTERNAL_GLOBAL_VIDEO_EVENTS)[number]

export type BaseEventHandler = (...args: any[]) => void

export type InternalChannels = {
  swEventChannel: SwEventChannel
  sessionChannel: SessionChannel
}

export type SDKWorkerHooks<
  OnDone = (options?: any) => void,
  OnFail = (options?: any) => void
> = AllOrNone<{
  onDone: OnDone
  onFail: OnFail
}>

export type InstanceMap = {
  get: <T extends unknown>(key: string) => T
  set: <T extends unknown>(key: string, value: T) => Map<string, T>
  remove: <T extends unknown>(key: string) => Map<string, T>
  getAll: () => [string, unknown][]
  deleteAll: () => Map<string, unknown>
}

type SDKWorkerBaseParams<T> = {
  channels: InternalChannels
  instance: T
  runSaga: any
  /**
   * TODO: rename `payload` with something more explicit or
   * create derived types of `SDKWorkerParams` with specific arguments (?)
   * @deprecated use `initialState`
   */
  payload?: any
  initialState?: any
  getSession: () => BaseSession | null
  instanceMap: InstanceMap
  dispatcher?: (
    type: any,
    payload: any,
    channel?: SwEventChannel | SessionChannel
  ) => SagaIterator
}

export type SDKWorkerParams<
  T,
  Hooks extends SDKWorkerHooks = SDKWorkerHooks
> = SDKWorkerBaseParams<T> & Hooks

export type SDKWorker<T, Hooks extends SDKWorkerHooks = SDKWorkerHooks> = (
  params: SDKWorkerParams<T, Hooks>
) => SagaIterator<any>

export type SDKWorkerDefinition<Hooks extends SDKWorkerHooks = SDKWorkerHooks> =
  {
    worker: SDKWorker<any>
    initialState?: any
  } & Hooks

interface LogFn {
  <T extends object>(obj: T, msg?: string, ...args: any[]): void
  (obj: unknown, msg?: string, ...args: any[]): void
  (msg: string, ...args: any[]): void
}
export interface SDKLogger {
  fatal: LogFn
  error: LogFn
  warn: LogFn
  info: LogFn
  debug: LogFn
  trace: LogFn
}

export interface WsTrafficOptions {
  type: 'send' | 'recv' | 'http'
  payload: JSONRPCResponse | JSONRPCRequest | any
}

export interface InternalSDKLogger extends SDKLogger {
  wsTraffic: (options: WsTrafficOptions) => void
}

export type UpdateMediaDirection =
  | 'sendonly'
  | 'recvonly'
  | 'sendrecv'
  | 'inactive'

type EnabledUpdateMedia = {
  direction: Extract<UpdateMediaDirection, 'sendonly' | 'sendrecv'>
  constraints?: MediaTrackConstraints
}

type DisabledUpdateMedia = {
  direction: Extract<UpdateMediaDirection, 'recvonly' | 'inactive'>
  constraints?: never
}

type MediaControl = EnabledUpdateMedia | DisabledUpdateMedia

export type UpdateMediaParams =
  | { audio: MediaControl; video?: MediaControl }
  | { audio?: MediaControl; video: MediaControl }
