import { makeRPCRequest } from './helpers'
import { BladeExecuteMethod } from '../utils/interfaces'

type BladeExecuteParams = {
  id?: string
  protocol: string
  method: BladeExecuteMethod
  params?: {
    [key: string]: any
  }
}

// FIXME: Blade execute does not exists anymore. Exposes a method to build a JSONRPC
export const BladeExecute = (params: BladeExecuteParams) => {
  return makeRPCRequest({
    // @ts-ignore
    method: 'method',
    params,
  })
}
