import { makeRPCRequest } from './helpers'

type WithToken = { token: string; jwt_token?: never }
type WithJWT = { token?: never; jwt_token: string }
type BladeConnectAuthentication = { project?: string } & (WithToken | WithJWT)
export type BladeConnectParams = {
  authentication: BladeConnectAuthentication
  version?: typeof DEFAULT_CONNECT_VERSION
  agent?: string
  protocol?: string
  contexts?: string[]
}

export const DEFAULT_CONNECT_VERSION = {
  major: 3,
  minor: 0,
  revision: 0,
}

export const BladeConnect = (params: BladeConnectParams) => {
  return makeRPCRequest({
    method: 'signalwire.connect',
    params: {
      version: DEFAULT_CONNECT_VERSION,
      ...params,
    },
  })
}
