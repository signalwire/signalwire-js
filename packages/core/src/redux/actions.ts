import { createAction } from '@reduxjs/toolkit'
import { ExecuteActionParams } from './interfaces'

export const initSessionAction = createAction('swSdk/init')
export const destroySessionAction = createAction('swSdk/destroy')

/**
 * Trigger saga to send a blade.execute over the wire
 */
export const executeAction = createAction<ExecuteActionParams>(
  'swSdk/executeRequest'
)
