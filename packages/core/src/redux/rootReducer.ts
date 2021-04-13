import { combineReducers } from 'redux'
import { componentReducer } from './slices'

export const rootReducer = combineReducers({
  components: componentReducer,
})
