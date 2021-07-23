import { makeRPCRequest } from './helpers'
import { JSONRPCMethod } from '../utils/interfaces'

type ExecuteParams = {
  id?: string
  method: JSONRPCMethod
  params: Record<string, unknown>
}

export const Execute = ({ method, params }: ExecuteParams) => {
  return makeRPCRequest({
    method,
    params,
  })
}
