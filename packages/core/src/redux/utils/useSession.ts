import { BaseSession } from '../../BaseSession'
import { getLogger } from '../../utils'
import { getEventEmitter } from '../../utils/EventEmitter'
import {
  InternalUserOptions,
  SessionConstructor,
  SessionEvents,
} from '../../utils/interfaces'
import { SessionChannel } from '../interfaces'

interface UseSessionOptions {
  userOptions: InternalUserOptions
  SessionConstructor: SessionConstructor
  sessionChannel: SessionChannel
}

export type SessionEventsHandlerMapping = Record<SessionEvents, () => void>

export type SessionEventsMap = {
  [k in keyof SessionEventsHandlerMapping]: SessionEventsHandlerMapping[k]
}

export const useSession = (options: UseSessionOptions) => {
  const { SessionConstructor, userOptions, sessionChannel } = options

  const sessionEmitter = getEventEmitter<SessionEventsMap>()

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
      getLogger().warn('Custom worker started without the session')
    }
    return session
  }

  return { session, initSession, getSession, sessionEmitter }
}
