import { makeRPCRequest } from '../helpers'

/**
 * @internal
 */
export interface InternalRPCExecuteParams {
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
export const InterRPCExecute = (params: InternalRPCExecuteParams) => {
  return makeRPCRequest({
    method: 'blade.execute',
    params,
  })
}
