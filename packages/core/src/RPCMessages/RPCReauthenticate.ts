import { makeRPCRequest } from './helpers'

type RPCReauthenticateParams = { project: string; jwt_token: string }

export const RPCReauthenticate = (authentication: RPCReauthenticateParams) => {
  return makeRPCRequest({
    method: 'signalwire.reauthenticate',
    params: {
      authentication,
    },
  })
}
