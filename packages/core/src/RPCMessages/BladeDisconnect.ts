import { makeRPCResponse } from './helpers'

export const BladeDisconnectResponse = (id: string) => {
  return makeRPCResponse({
    id,
    result: {},
  })
}
