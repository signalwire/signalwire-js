import { createAction, Action } from './toolkit'
import type {
  JSONRPCRequest,
  SessionAuthError,
  SessionEvents,
  SessionActions,
  CompoundEvents,
} from '../utils/interfaces'
import { EventEmitter } from '..'

export const initAction = createAction('swSdk/init')
export const destroyAction = createAction('swSdk/destroy')
/**
 * Used to trigger a `signalwire.reauthenticate`
 */
export const reauthAction = createAction<{ token: string }>('swSdk/reauth')

export const authErrorAction = createAction<{ error: SessionAuthError }>(
  'auth/error'
)
export const authSuccessAction = createAction('auth/success')
export const authExpiringAction = createAction('auth/expiring')

export const socketMessageAction = createAction<JSONRPCRequest, string>(
  'socket/message'
)

// TODO: define if we need/want to send a payload with these events.
export const sessionConnectedAction = createAction<void, SessionEvents>(
  'session.connected'
)
export const sessionDisconnectedAction = createAction<void, SessionEvents>(
  'session.disconnected'
)
export const sessionReconnectingAction = createAction<void, SessionEvents>(
  'session.reconnecting'
)
export const sessionAuthErrorAction = createAction<Error, SessionEvents>(
  'session.auth_error'
)
export const sessionExpiringAction = createAction<void, SessionEvents>(
  'session.expiring'
)
export const sessionForceCloseAction = createAction<void, SessionActions>(
  'session.forceClose'
)
const formatCustomSagaAction = (id: string, action: Action) => {
  return `${action.type}/${id}`
}

export const makeCustomSagaAction = (id: string, action: Action) => {
  return {
    ...action,
    type: formatCustomSagaAction(id, action),
  }
}

export const getCustomSagaActionType = (id: string, action: Action) => {
  return formatCustomSagaAction(id, action)
}

export const compoundEventAttachAction = createAction<
  {
    compoundEvents: EventEmitter.EventNames<EventEmitter.ValidEventTypes>[]
    event: EventEmitter.EventNames<EventEmitter.ValidEventTypes>
    namespace?: string
  },
  CompoundEvents
>('compound_event:attach')

export { createAction }
