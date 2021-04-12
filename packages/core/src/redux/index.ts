import { Store, createStore } from 'redux'
// import { composeWithDevTools } from 'redux-devtools-extension'
// import createSagaMiddleware from 'redux-saga'
import { rootReducer } from './rootReducer'
import { SDKState } from './interfaces'
// import rootSaga from './rootSaga'
// import { CantinaState } from './interfaces'

// const sagaMiddleware = createSagaMiddleware()

// interface ConfigureStoreOptions {
//   runSagaMiddleware?: boolean
// }

let store: Store
export const getStore = () => {
  if (store) {
    return store
  }
  store = configureStore()
  // @ts-ignore
  window['__store'] = store
  return store
}

export const configureStore = (
  preloadedState: Partial<SDKState> = {}
  // options: ConfigureStoreOptions = {}
) => {
  // const { runSagaMiddleware = true } = options
  // const middlewares = [sagaMiddleware]

  const store = createStore(
    rootReducer,
    preloadedState
    // composeWithDevTools(applyMiddleware(...middlewares))
  )

  // if (runSagaMiddleware) {
  //   sagaMiddleware.run(rootSaga)
  // }

  return store
}
