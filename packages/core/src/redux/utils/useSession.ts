import { BaseSession } from '../../BaseSession'
import { getLogger } from '../../utils'
import { getEventEmitter } from '../../utils/EventEmitter'
import {
  ClientEvents,
  InstanceMap,
  InternalUserOptions,
  SessionConstructor,
} from '../../utils/interfaces'
import { SessionChannel } from '../interfaces'

interface UseSessionOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  sessionChannel: SessionChannel
  instanceMap: InstanceMap
}

export const useSession = (options: UseSessionOptions) => {
  const { SessionConstructor, userOptions, sessionChannel, instanceMap } = options

  const sessionEmitter = getEventEmitter<ClientEvents>()

  let session: BaseSession | null = null

  const initSession = () => {
    session = new SessionConstructor({
      ...userOptions,
      sessionChannel,
      instanceMap,
    })
    return session
  }

  const getSession = () => {
    if (!session) {
      getLogger().warn('Custom worker started without the session')
    }
    return session
  }

  return { session, initSession, getSession, sessionEmitter }
}
