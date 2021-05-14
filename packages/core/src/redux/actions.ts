import { createAction } from '@reduxjs/toolkit'
import {
  JSONRPCRequest,
  SessionAuthError,
  SessionEvents,
} from '../utils/interfaces'
import { ExecuteActionParams, SocketCloseParams } from './interfaces'

export const initAction = createAction('swSdk/init')
export const destroyAction = createAction('swSdk/destroy')

/**
 * Trigger saga to send a blade.execute over the wire
 */
export const executeAction = createAction<ExecuteActionParams>(
  'swSdk/executeRequest'
)

export const authError = createAction<{ error: SessionAuthError }>('auth/error')
export const authSuccess = createAction('auth/success')

export const socketClosed = createAction<SocketCloseParams>('socket/closed')
export const socketError = createAction('socket/error')
export const socketMessage = createAction<JSONRPCRequest, string>(
  'socket/message'
)

// TODO: define if we need/want to send a payload with these events.
export const sessionConnected = createAction<void, SessionEvents>(
  'session.connected'
)
export const sessionDisconnected = createAction<void, SessionEvents>(
  'session.disconnected'
)
export const sessionReconnecting = createAction<void, SessionEvents>(
  'session.reconnecting'
)
