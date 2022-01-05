import { Store } from 'redux'
import { configureJestStore } from '../../../testUtils'
import {
  componentCleanupSaga,
  componentCleanupSagaWorker,
} from './componentSaga'
import { expectSaga } from 'redux-saga-test-plan'
import { rootReducer } from '../../rootReducer'

describe('componentSelectors', () => {
  let store: Store

  beforeEach(() => {
    store = configureJestStore({
      preloadedState: {
        components: {
          byId: {
            '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9': {
              id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
            },
            'faa63915-3a64-4c39-acbb-06dac0758f8a': {
              id: 'faa63915-3a64-4c39-acbb-06dac0758f8a',
              responses: {},
            },
            'zfaa63915-3a64-4c39-acbb-06dac0758f8a': {
              id: 'zfaa63915-3a64-4c39-acbb-06dac0758f8a',
              errors: {},
            },
          },
        },
      },
    })
  })

  describe('componentCleanupSaga', () => {
    it('should cleanup unused components from the store', () => {
      return expectSaga(componentCleanupSagaWorker)
        .withReducer(rootReducer, store.getState())
        // .delay(3000)
        .hasFinalState({
          components: {
            byId: {
              '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9': {
                id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
              },
            },
          },
          session: {
            protocol: '',
            iceServers: [],
            authStatus: 'unknown',
            authError: undefined,
            authCount: 0,
          },
          executeQueue: { queue: [] },
        })
        .run()
    })
  })
})
