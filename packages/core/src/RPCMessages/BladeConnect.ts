import { makeRPCRequest } from './helpers'
import { BladeMethod } from '../utils/constants'

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
  major: 2,
  minor: 5,
  revision: 0,
}

export const BladeConnect = (params: BladeConnectParams) => {
  return makeRPCRequest({
    method: BladeMethod.Connect,
    params: {
      version: DEFAULT_CONNECT_VERSION,
      ...params,
    },
  })
}
