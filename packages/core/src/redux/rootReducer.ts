import { combineReducers } from '@reduxjs/toolkit'
import { componentReducer } from './slices'

export const rootReducer = combineReducers({
  components: componentReducer,
})
