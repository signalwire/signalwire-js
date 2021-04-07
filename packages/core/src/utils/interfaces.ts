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
}

export interface SessionRequestObject {
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
