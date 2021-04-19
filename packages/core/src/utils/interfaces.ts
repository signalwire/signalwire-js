export interface Emitter {
  on(eventName: string, handler: Function, once?: boolean): this
  once(eventName: string, handler: Function): this
  off(eventName: string, handler?: Function): this
  emit(eventName: string, ...args: any[]): boolean
  removeAllListeners(): this
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

export interface UserOptions extends SessionOptions {
  devTools?: boolean
  pubSub?: Emitter
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
