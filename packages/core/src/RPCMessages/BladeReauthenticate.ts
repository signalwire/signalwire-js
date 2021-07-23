import { makeRPCRequest } from './helpers'

type BladeReauthenticateParams = { project: string; jwt_token: string }

export const BladeReauthenticate = (
  authentication: BladeReauthenticateParams
) => {
  return makeRPCRequest({
    method: 'signalwire.reauthenticate',
    params: {
      authentication,
    },
  })
}
