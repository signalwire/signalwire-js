import { JSONRPCRequest, JSONRPCResponse } from '../utils/interfaces'
import { makeRPCResponse } from '../RPCMessages/helpers'

/**
 * Blade (JSONRPC) layer 1 operations
 * @internal
 */
export type InternalRPCMethods =
  | 'blade.ping'
  | 'blade.connect'
  | 'blade.execute'
  | 'blade.protocol'

/**
 * @internal
 */
const JSONRPCParseError = -32700 as const
/**
 * @internal
 */
const JSONRPCInvalidRequest = -32600 as const
/**
 * @internal
 */
export const JSONRPCMethodNotFound = -32601 as const
/**
 * @internal
 */
const JSONRPCInvalidParams = -32602 as const
/**
 * @internal
 */
const JSONRPCInternalError = -32603 as const
/**
 * @internal
 */
type JSONRPCErrorCodes =
  | typeof JSONRPCParseError
  | typeof JSONRPCInvalidRequest
  | typeof JSONRPCMethodNotFound
  | typeof JSONRPCInvalidParams
  | typeof JSONRPCInternalError

/**
 * @internal
 */
type InternalRPCResponseProperties = {
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
export type InternalRPCResponse = Omit<JSONRPCResponse, 'result' | 'error'> &
  OnlyOne<InternalRPCResponseProperties, 'result' | 'error'>

/**
 * @internal
 */
export const makeInternalRPCResultResponse = (
  request: JSONRPCRequest,
  result: Record<string, any>
): InternalRPCResponse => {
  return makeRPCResponse({
    id: request.id,
    result,
  })
}

/**
 * we can't use makeRPCResponse here, since it only returns `result` and never return `error`
 * @internal
 */
export const makeInternalRPCErrorResponse = (
  request: JSONRPCRequest,
  code: JSONRPCErrorCodes,
  message: string
): InternalRPCResponse => {
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
/**
 * @internal
 */
export interface InternalRPCCommonBody {
  requester_identity: string
  responder_identity: string
}

/**
 * @internal
 */
export interface InternalRPCRequestBody extends InternalRPCCommonBody {
  protocol: string
  method: string
  params: Record<string, unknown>
}

/**
 * We're using 3.0 conventions
 * @internal
 */
export type InternalRPCResult = Record<string, any>

/**
 * The RPC Response only contains a `result` field.
 * The `code` field can be used (assuming it's different from `200`) to indicate
 * an application-level error.
 * @internal
 */
export interface InternalRPCResponseBody {
  result: InternalRPCCommonBody & {
    code: string
    message?: string
  } & InternalRPCResult
}

/**
 * @internal
 */
export type RequestHandler = (
  request: InternalRPCRequestBody
) => Promise<InternalRPCResponseBody>

export type RPCMethodHandler = [method: string, handler: RequestHandler]

/**
 * @internal
 */
export const makeInternalRPCResultResponseBody = (
  request: InternalRPCRequestBody,
  result: Record<string, any>
): InternalRPCResponseBody => {
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
export const makeInternalRPCErrorResponseBody = (
  request: InternalRPCRequestBody,
  code: string,
  message?: string
): InternalRPCResponseBody => {
  return makeInternalRPCResultResponseBody(request, { code, message })
}
