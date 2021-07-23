import { makeRPCRequest, makeRPCResponse } from './helpers'

export const BladePing = () => {
  return makeRPCRequest({
    method: 'signalwire.ping',
    params: {
      timestamp: Date.now() / 1000,
    },
  })
}

export const BladePingResponse = (id: string, timestamp?: number) => {
  return makeRPCResponse({
    id,
    result: {
      timestamp: timestamp || Date.now() / 1000,
    },
  })
}
