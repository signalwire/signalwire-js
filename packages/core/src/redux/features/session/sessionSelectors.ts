import { SDKState } from '../../interfaces'

export const getIceServers = ({ session }: SDKState) => {
  return session?.iceServers ?? []
}

export const getSession = (store: SDKState) => {
  return store.session
}
