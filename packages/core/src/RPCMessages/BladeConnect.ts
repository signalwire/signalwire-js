import { BladeRequest, makeBladeRequest } from './Blade'
import { RPCConnectParams } from './RPCConnect'

/**
 * @internal
 */
export type BladeConnectParams = Pick<
  RPCConnectParams,
  'version' | 'agent' | 'protocol'
> & {
  protocols: { protocol: string; rank: number }[]
}

/**
 * @internal
 */
export const BladeConnect = (params: BladeConnectParams): BladeRequest => {
  return makeBladeRequest({
    method: 'blade.connect',
    // @ts-ignore
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
