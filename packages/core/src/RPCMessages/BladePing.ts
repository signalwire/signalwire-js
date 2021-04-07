import { makeRPCRequest, makeRPCResponse } from './helpers'
import { BladeMethod } from '../utils/constants'

export const BladePing = () => {
  return makeRPCRequest({
    method: BladeMethod.Ping,
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
