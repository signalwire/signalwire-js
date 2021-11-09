import { makeRPCRequest } from './helpers'

/**
 * @internal
 */
export interface BladeExecuteParams {
  requester_identity?: string
  responder_identity?: string
  attempted?: string[]
  protocol: string
  method: string
  params?: any
}

/**
 * @internal
 */
export const InterRPCExecute = (params: BladeExecuteParams) => {
  return makeRPCRequest({
    method: 'blade.execute',
    params,
  })
}
