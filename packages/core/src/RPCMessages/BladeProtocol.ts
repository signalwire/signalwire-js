import { BladeRequest, makeBladeRequest } from './Blade'

/**
 * @internal
 */
export interface BladeProtocolParams {
  protocol: string
  command: 'provider.add' | 'provider.rank.update'
  params?: {
    rank: number
  }
}

/**
 * @internal
 */
export const BladeProtocol = (params: BladeProtocolParams): BladeRequest => {
  return makeBladeRequest({
    method: 'blade.protocol',
    // @ts-ignore
    params,
  })
}
