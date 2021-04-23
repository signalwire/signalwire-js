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
  project: string
  token: string
  onReady?: () => Promise<void>
  autoConnect?: boolean
}

export interface UserOptions<T = {}> extends SessionOptions {
  devTools?: boolean
  emitter?: Emitter<T>
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
  expires_at: number
  signature: string
  project: string
  scope_id: string
  scopes: string[]
  resource: string
}

export type SessionConstructor = typeof Session
