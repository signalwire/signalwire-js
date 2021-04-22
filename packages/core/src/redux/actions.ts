import { createAction } from '@reduxjs/toolkit'
import { ExecuteActionParams } from './interfaces'

export const initAction = createAction('swSdk/init')
export const destroyAction = createAction('swSdk/destroy')

/**
 * Trigger saga to send a blade.execute over the wire
 */
export const executeAction = createAction<ExecuteActionParams>(
  'swSdk/executeRequest'
)
