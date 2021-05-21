import { makeRPCRequest } from './helpers'
import { BladeMethod } from '../utils/constants'
import { BladeExecuteMethod } from '../utils/interfaces'

type BladeExecuteParams = {
  id?: string
  protocol: string
  method: BladeExecuteMethod
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
