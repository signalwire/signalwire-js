import { BaseSession } from '../../BaseSession'
import { getLogger } from '../../utils'
import { getEventEmitter } from '../../utils/EventEmitter'
import {
  ClientEvents,
  InternalUserOptions,
  SessionConstructor,
} from '../../utils/interfaces'
import { SessionChannel } from '../interfaces'

interface UseSessionOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  sessionChannel: SessionChannel
}

export const useSession = (options: UseSessionOptions) => {
  const { SessionConstructor, userOptions, sessionChannel } = options

  const sessionEmitter = getEventEmitter<ClientEvents>()

  let session: BaseSession | null = null

  const initSession = () => {
    session = new SessionConstructor({
      ...userOptions,
      sessionChannel,
    })
    return session
  }

  const getSession = () => {
    if (!session) {
      getLogger().warn('Session does not exist!')
    }
    return session
  }

  return { session, initSession, getSession, sessionEmitter }
}
