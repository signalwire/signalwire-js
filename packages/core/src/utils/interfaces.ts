import type { EventEmitter } from '../utils/EventEmitter'
import { BaseSession } from '../BaseSession'
import { SDKStore } from '../redux'
import {
  GLOBAL_VIDEO_EVENTS,
  INTERNAL_GLOBAL_VIDEO_EVENTS,
  PRODUCT_PREFIXES,
} from './constants'

/**
 * Minimal interface the emitter must fulfill
 */
export type Emitter = Pick<
  EventEmitter,
  'on' | 'off' | 'once' | 'emit' | 'removeAllListeners' | 'eventNames' | 'listenerCount'
>

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
  host?: string
  project?: string
  token: string
  autoConnect?: boolean
  // From `LogLevelDesc` of loglevel to simplify our docs
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'
}

export interface UserOptions extends SessionOptions {
  devTools?: boolean
  emitter?: Emitter
}

/**
 * `UserOptions` is exposed to the end user and `BaseClientOptions` is
 * the interface we use internally that extends the options provided.
 * @internal
 */
export interface BaseClientOptions extends UserOptions {
  store: SDKStore
  emitter: Emitter
}

export interface BaseComponentOptions {
  store: SDKStore
  emitter: Emitter
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

/** List of all the events the client can listen to. */
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

export type RoomCustomMethods<T> = {
  [k in keyof T]: PropertyDescriptor
}

export type EventsPrefix = '' | typeof PRODUCT_PREFIXES[number]
/**
 * See {@link GLOBAL_VIDEO_EVENTS} for the full list of events.
 */
export type GlobalVideoEvents = typeof GLOBAL_VIDEO_EVENTS[number]
export type InternalGlobalVideoEvents =
  typeof INTERNAL_GLOBAL_VIDEO_EVENTS[number]

export interface EventTransform {
  instanceFactory: (payload: any) => any
  payloadTransform: (payload: any) => any
  getInstanceEventNamespace?: (payload: any) => string
  getInstanceEventChannel?: (payload: any) => string
}

export type BaseEventHandler = (...args: any[]) => void
