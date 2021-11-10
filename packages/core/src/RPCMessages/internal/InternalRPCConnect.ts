import { makeRPCRequest } from '../helpers'
import { RPCConnectParams } from '../RPCConnect'

/**
 * @internal
 */
export type InternalRPCConnectParams = Pick<
  RPCConnectParams,
  'version' | 'agent' | 'protocol'
> & {
  protocols: { protocol: string; rank: number }[]
}

/**
 * @internal
 */
export const InternalRPCConnect = (params: InternalRPCConnectParams) => {
  return makeRPCRequest({
    method: 'blade.connect',
    params: {
      version: {
        major: 2,
        minor: 5,
        revision: 0,
      },
      ...params,
    },
  })
}
