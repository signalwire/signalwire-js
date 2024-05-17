import { makeRPCRequest } from './helpers'

type WithToken = { token: string; jwt_token?: never }
type WithJWT = { token?: never; jwt_token: string }
type RPCConnectAuthentication = { project?: string } & (WithToken | WithJWT)
export type RPCConnectParams = {
  authentication: RPCConnectAuthentication
  version?: typeof DEFAULT_CONNECT_VERSION
  agent?: string
  protocol?: string
  authorization_state?: string
  contexts?: string[]
  topics?: string[]
  eventing?: string[]
  event_acks?: boolean
}

export const DEFAULT_CONNECT_VERSION = {
  major: 3,
  minor: 0,
  revision: 0,
}

export const UNIFIED_CONNECT_VERSION = {
  major: 4,
  minor: 0,
  revision: 0,
}

export const RPCConnect = (params: RPCConnectParams) => {
  return makeRPCRequest({
    method: 'signalwire.connect',
    params: {
      version: DEFAULT_CONNECT_VERSION,
      event_acks: true,
      ...params,
    },
  })
}
