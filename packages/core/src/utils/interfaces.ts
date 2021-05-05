import { Store } from 'redux'
import { Session } from '../Session'

export interface Emitter<T = {}> {
  on(eventName: string, handler: Function, once?: boolean): T
  once(eventName: string, handler: Function): T
  off(eventName: string, handler?: Function): T
  emit(eventName: string, ...args: any[]): boolean
  removeAllListeners(): T
}

type JSONRPCParams = {
  [key: string]: any
}

type JSONRPCResult = {
  [key: string]: any
}

type JSONRPCError = {
  [key: string]: any
}

export interface JSONRPCRequest {
  jsonrpc: '2.0'
  id: string
  method: string
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
}

export interface UserOptions<T = {}> extends SessionOptions {
  devTools?: boolean
  emitter?: Emitter<T>
}

export interface BaseClientOptions<T = {}> extends UserOptions<T> {
  emitter: Emitter<T>
}

export interface BaseComponentOptions<T = {}> {
  store: Store
  emitter: Emitter<T>
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

export interface IBladeAuthorization {
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

export interface IBladeConnectResult {
  session_restored: boolean
  sessionid: string
  nodeid: string
  identity: string
  master_nodeid: string
  authorization: IBladeAuthorization
  result?: {
    protocol: string
    iceServers?: RTCIceServer[]
  }
}

export type SessionConstructor = typeof Session

export type SessionAuthStatus =
  | 'unknown'
  | 'authorizing'
  | 'authorized'
  | 'unauthorized'

export type SessionAuthError = {
  code: number
  error: string
}
