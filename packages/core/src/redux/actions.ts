import { createAction } from '@reduxjs/toolkit'

export const initSessionAction = createAction<any>('swSdk/init')
export const destroySessionAction = createAction('swSdk/destroy')

export const executeAction = createAction<any>('swSdk/executeRequest')
