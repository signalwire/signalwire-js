import { SDKState } from '../../interfaces'

export const getIceServers = ({ session }: SDKState) => {
  return session?.iceServers ?? []
}
