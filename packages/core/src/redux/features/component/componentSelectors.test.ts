import { configureJestStore } from '../../../testUtils'
import { getComponent, getComponentsById } from './componentSelectors'
import { SDKStore } from '../..'

describe('componentSelectors', () => {
  const preloadedState = {
    components: {
      byId: {
        '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9': {
          id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
          foo: 'bar',
        },
        'faa63915-3a64-4c39-acbb-06dac0758f8a': {
          id: 'faa63915-3a64-4c39-acbb-06dac0758f8a',
          responses: {},
        },
      },
    },
  }
  let store: SDKStore

  beforeEach(() => {
    store = configureJestStore({
      preloadedState,
    })
  })

  describe('getComponent', () => {
    it('should return a component', () => {
      const id = '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9'
      expect(getComponent(store.getState(), id)).toStrictEqual(
        preloadedState.components.byId[id]
      )
    })
  })

  describe('getComponentsById', () => {
    it('should return a component', () => {
      expect(getComponentsById(store.getState())).toStrictEqual(
        preloadedState.components.byId
      )
    })
  })
})
