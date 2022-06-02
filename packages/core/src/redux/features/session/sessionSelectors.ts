import { SDKState } from '../../interfaces'
import { Authorization } from '../../../utils/interfaces'

export const getIceServers = ({ session }: SDKState) => {
  return session?.iceServers ?? []
}

export const getSession = (store: SDKState) => {
  return store.session
}

export const getAuthStatus = ({ session }: SDKState) => {
  return session.authStatus
}

export const getAuthError = ({ session }: SDKState) => {
  return session.authError
}

export const getAuthState = ({ session }: SDKState) => {
  if (!session.authState) {
    return undefined
  }

  const authState: Authorization = {
    ...session.authState,
    // TODO: these are just for testing purposes until the BE starts sending them
    audio_allowed: true,
    video_allowed: true,
  }

  return authState
}
