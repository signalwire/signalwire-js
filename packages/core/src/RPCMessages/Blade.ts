import { uuid } from '../utils'

/**
 * Base JSONRPC format
 * @internal
 */
interface IBaseJSONRPCPayload {
  jsonrpc: '2.0'
  id: string
}

/**
 * Blade (JSONRPC) layer 1 operations
 * @internal
 */
export type BladeRPCMethods =
  | 'blade.connect'
  | 'blade.execute'
  | 'blade.protocol'

/**
 * @internal
 */
export interface BladeRequest extends IBaseJSONRPCPayload {
  method: BladeRPCMethods
  params: BladeRPCRequest
}

/**
 * See https://www.jsonrpc.org/specification#response_object
 * @internal
 */
export const JSONRPCParseError = -32700 as const
/**
 * @internal
 */
export const JSONRPCInvalidRequest = -32600 as const
/**
 * @internal
 */
export const JSONRPCMethodNotFound = -32601 as const
/**
 * @internal
 */
export const JSONRPCInvalidParams = -32602 as const
/**
 * @internal
 */
export const JSONRPCInternalError = -32603 as const
/**
 * @internal
 */
export type JSONRPCErrorCodes =
  | typeof JSONRPCParseError
  | typeof JSONRPCInvalidRequest
  | typeof JSONRPCMethodNotFound
  | typeof JSONRPCInvalidParams
  | typeof JSONRPCInternalError

/**
 * @internal
 */
export type BladeResponseProperties = {
  result: Record<string, any>
  error: {
    code: JSONRPCErrorCodes
    message: string
    data?: Record<string, any>
  }
}

type OnlyOne<T, Keys extends keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

/**
 * @internal
 */
export type BladeResponse = IBaseJSONRPCPayload &
  OnlyOne<BladeResponseProperties, 'result' | 'error'>

/**
 * @internal
 */
export const makeBladeRequest = ({
  method,
  params,
}: {
  method: BladeRequest['method']
  params: BladeRequest['params']
}): BladeRequest => {
  return {
    jsonrpc: '2.0',
    id: uuid(),
    method,
    params,
  }
}

/**
 * @internal
 */
export const makeBladeResultResponse = (
  request: BladeRequest,
  result: Record<string, any>
): BladeResponse => {
  return {
    jsonrpc: '2.0',
    id: request.id,
    result,
  }
}

/**
 * @internal
 */
export const makeBladeErrorResponse = (
  request: BladeRequest,
  code: JSONRPCErrorCodes,
  message: string
): BladeResponse => {
  return {
    jsonrpc: '2.0',
    id: request.id,
    error: {
      code,
      message,
    },
  }
}

// The following types are implicated in `blade.execute`.
// Blade layer 2 operations

// See switchblade/Messages/ExecuteResult.cs
/**
 * @internal
 */
export interface BladeRPCCommonBody {
  requester_identity: string
  responder_identity: string
}

/**
 * @internal
 */
export interface BladeRPCRequest extends BladeRPCCommonBody {
  protocol: string
  method: string
  params: Record<string, unknown>
}

// Blade 3.0 conventions: the results are flattened inside the response result
type BladeRPC30Result = Record<string, any>

/**
 * We're using 3.0 conventions
 * @internal
 */
export type BladeRPCResult = BladeRPC30Result

/**
 * The RPC Response only contains a `result` field.
 * The `code` field can be used (assuming it's different from `200`) to indicate
 * an application-level error.
 * @internal
 */
export interface BladeRPCResponse {
  result: BladeRPCCommonBody & {
    code: string
    message?: string
  } & BladeRPCResult
}

/**
 * @internal
 */
export type RequestHandler = (
  request: BladeRPCRequest
) => Promise<BladeRPCResponse>

export type RPCMethodHandler = [method: string, handler: RequestHandler]

/**
 * @internal
 */
export const makeBladeRPCResultResponse = (
  request: BladeRPCRequest,
  result: Record<string, any>
): BladeRPCResponse => {
  return {
    result: {
      requester_identity: request.requester_identity,
      responder_identity: request.responder_identity,

      // NB: code and message might be overriden in `result` by the application
      // to indicate an application-level error, see below in
      // `makeBladeRPCErrorResponse`.
      code: '200',
      message: 'OK',
      ...result,
    },
  }
}

/**
 * @internal
 */
export const makeBladeRPCErrorResponse = (
  request: BladeRPCRequest,
  code: string,
  message?: string
): BladeRPCResponse => {
  return makeBladeRPCResultResponse(request, { code, message })
}
