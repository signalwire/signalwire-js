import { combineReducers } from '@reduxjs/toolkit'
import { componentReducer } from './features'

export const rootReducer = combineReducers({
  components: componentReducer,
})
