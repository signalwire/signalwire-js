import { uuid } from '../utils'

type MakeRPCRequestParams = {
  method: string // TODO: use enum
  params: {
    // TODO: use list of types?
    [key: string]: any
  }
}
export const makeRPCRequest = (params: MakeRPCRequestParams) => {
  return {
    jsonrpc: '2.0' as const,
    id: uuid(),
    ...params,
  }
}

type MakeRPCResponseParams = {
  id: string
  result: {
    // TODO: use list of types?
    [key: string]: any
  }
}
export const makeRPCResponse = (params: MakeRPCResponseParams) => {
  return {
    jsonrpc: '2.0' as const,
    ...params,
  }
}
