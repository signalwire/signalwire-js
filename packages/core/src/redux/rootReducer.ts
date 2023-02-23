import { combineReducers } from './toolkit'
import { componentReducer, sessionReducer } from './features'

export const rootReducer = combineReducers({
  components: componentReducer,
  session: sessionReducer,
})
