import { combineReducers } from '@reduxjs/toolkit'
import { componentReducer, sessionReducer } from './features'

export const rootReducer = combineReducers({
  components: componentReducer,
  session: sessionReducer,
})
