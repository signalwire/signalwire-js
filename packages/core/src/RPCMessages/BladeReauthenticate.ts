import { makeRPCRequest } from './helpers'
import { BladeMethod } from '../utils/constants'

type BladeReauthenticateParams = { project: string; jwt_token: string }

export const BladeReauthenticate = (
  authentication: BladeReauthenticateParams
) => {
  return makeRPCRequest({
    method: BladeMethod.Reauthenticate,
    params: {
      authentication,
    },
  })
}
