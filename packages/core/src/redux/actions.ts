import { createAction } from '@reduxjs/toolkit'
import { JSONRPCRequest, SessionAuthError } from '../utils/interfaces'
import { ExecuteActionParams } from './interfaces'

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

export const socketClosed = createAction('socket/closed')
export const socketError = createAction('socket/error')
export const socketMessage = createAction<JSONRPCRequest, string>(
  'socket/message'
)
