import { createAction } from '@reduxjs/toolkit'
import {
  JSONRPCRequest,
  SessionAuthError,
  SessionEvents,
} from '../utils/interfaces'
import { ExecuteActionParams } from './interfaces'

export const initAction = createAction('swSdk/init')
export const destroyAction = createAction('swSdk/destroy')
export const closeConnectionAction = createAction('swSdk/closeConnection')

/**
 * Trigger saga to send a blade.execute over the wire
 */
export const executeAction = createAction<ExecuteActionParams>(
  'swSdk/executeRequest'
)

export const authErrorAction = createAction<{ error: SessionAuthError }>(
  'auth/error'
)
export const authSuccessAction = createAction('auth/success')

export const socketClosedAction = createAction('socket/closed')
export const socketErrorAction = createAction('socket/error')
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

type VertoAttachActionParams = {
  callID: string
  sdp: string
}
export const vertoAttachAction = createAction<VertoAttachActionParams>(
  'sdk/attach'
)
