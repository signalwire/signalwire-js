import { Store } from 'redux'
import { configureJestStore } from '../../../testUtils'
import { componentActions, initialComponentState } from './componentSlice'
import { getComponent, getComponentsById } from './componentSelectors'
import { destroyAction } from '../../actions'
import { ReduxComponent } from '../../interfaces'

describe('ComponentState Tests', () => {
  let store: Store
  const componentId = '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9'
  const component: ReduxComponent = {
    id: componentId,
  }

  beforeEach(() => {
    store = configureJestStore()
  })

  describe('update action', () => {
    it('should create a new entry if the id is not in the state', () => {
      expect(getComponent(store.getState(), componentId)).toBeUndefined()
      store.dispatch(componentActions.upsert(component))

      expect(getComponent(store.getState(), componentId)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
      })
    })

    it('should update the state properly', () => {
      store.dispatch(componentActions.upsert(component))

      expect(getComponent(store.getState(), componentId)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
      })

      store.dispatch(
        componentActions.upsert({
          ...component,
          state: 'active',
        })
      )
      expect(getComponent(store.getState(), componentId)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
        state: 'active',
      })
    })
  })

  describe('cleanup action', () => {
    const s = configureJestStore({
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

    s.dispatch(
      componentActions.cleanup({
        ...component,
        ids: [
          '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
          'faa63915-3a64-4c39-acbb-06dac0758f8a',
        ],
      })
    )

    expect(getComponentsById(s.getState())).toStrictEqual({
      'zfaa63915-3a64-4c39-acbb-06dac0758f8a': {
        id: 'zfaa63915-3a64-4c39-acbb-06dac0758f8a',
        errors: {},
      },
    })
  })

  it('should reset to initial on destroyAction', () => {
    // Create some components first
    store.dispatch(componentActions.upsert(component))
    store.dispatch(
      componentActions.upsert({
        id: 'random',
      })
    )

    store.dispatch(destroyAction())
    expect(store.getState().components).toStrictEqual(initialComponentState)
  })
})
