import { configureJestStore } from '../../../testUtils'
import { getComponentsToCleanup } from './componentSelectors'
import { SDKStore } from '../..'

describe('componentSelectors', () => {
  let store: SDKStore

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

  describe('getComponentsToCleanup', () => {
    it('should return the list of components to cleanup', () => {
      expect(getComponentsToCleanup(store.getState())).toEqual([
        'faa63915-3a64-4c39-acbb-06dac0758f8a',
        'zfaa63915-3a64-4c39-acbb-06dac0758f8a',
      ])
    })
  })
})
