import { JSONRPCRequest, JSONRPCResponse } from './interfaces'

type parseRPCResponseParams = {
  response: JSONRPCResponse
  request: JSONRPCRequest
}
export const parseRPCResponse = ({
  response,
  request,
}: parseRPCResponseParams) => {
  const { result = {}, error } = response
  if (error) {
    return {
      error,
    }
  }

  switch (request.method) {
    case 'signalwire.connect':
      return { result }
    default:
      return parseResponse(response)
  }
}

/**
 * From the socket we can get:
 * - JSON-RPC msg with 1 level of 'result' or 'error'
 * - JSON-RPC msg with 2 nested 'result' and 'code' property to identify error
 * - JSON-RPC msg with 3 nested 'result' where the third level is the Verto JSON-RPC flat msg.
 *
 * @returns Object with error | result key to identify success or fail
 */
const parseResponse = (
  response: JSONRPCResponse,
  nodeId?: string
): { [key: string]: any } => {
  const { result = {}, error } = response
  if (error) {
    return { error }
  }
  const { code, node_id, result: vertoResult = null } = result
  if (code && code !== '200') {
    return { error: result }
  }
  if (vertoResult === null) {
    if (nodeId) {
      // Attach node_id to the vertoResult
      result.node_id = nodeId
    }
    return { result }
  }
  if (vertoResult) {
    return parseResponse(vertoResult, node_id)
  }
  return { result }
}
