import { BladeRequest, makeBladeRequest } from './Blade'

/**
 * @internal
 */
export interface BladeExecuteParams {
  // References:
  // - https://github.com/signalwire/relay-apis/blob/master/blade/2.5/blade.execute.md
  // - switchblade/Messages/ExecuteParams.cs

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
export const BladeExecute = (params: BladeExecuteParams): BladeRequest => {
  return makeBladeRequest({
    method: 'blade.execute',
    // @ts-ignore
    params,
  })
}
