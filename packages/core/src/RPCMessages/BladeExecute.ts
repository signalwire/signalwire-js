import { makeRPCRequest } from './helpers'
import { BladeMethod } from '../utils/constants'

type BladeExecuteParams = {
  id?: string
  protocol: string
  method: string
  params?: {
    [key: string]: any
  }
}

export const BladeExecute = (params: BladeExecuteParams) => {
  return makeRPCRequest({
    method: BladeMethod.Execute,
    params,
  })
}
