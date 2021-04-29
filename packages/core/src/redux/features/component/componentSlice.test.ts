import { Store } from 'redux'
import { configureJestStore } from '../../../testUtils'
import { componentActions, initialComponentState } from './componentSlice'
import { getComponent } from './componentSelectors'
import { destroyAction, executeAction } from '../../actions'
import { ReduxComponent } from '../../interfaces'
import { JSONRPCResponse } from '../../../utils/interfaces'

describe('SessionState Tests', () => {
  let store: Store
  const requestId = 'faa63915-3a64-4c39-acbb-06dac0758f8a'
  const componentId = '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9'
  const component: ReduxComponent = {
    id: componentId,
  }

  beforeEach(() => {
    store = configureJestStore()
  })

  describe('update action', () => {
    it('should update the state properly', () => {
      store.dispatch(componentActions.update(component))

      expect(getComponent(store.getState(), component.id)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
      })

      store.dispatch(
        componentActions.update({
          ...component,
          state: 'active',
        })
      )
      expect(getComponent(store.getState(), component.id)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
        state: 'active',
      })
    })
  })

  describe('executeSuccess action', () => {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 'request-uuid',
      result: {
        code: 200,
      },
    }
    const executeSuccessAction = componentActions.executeSuccess({
      componentId,
      requestId,
      response,
    })
    it('should not change the state if the componentId does not exist', () => {
      store.dispatch(executeSuccessAction)
      expect(store.getState().components).toStrictEqual({})
    })

    it('should update the state properly including the response', () => {
      // Create the component first
      store.dispatch(componentActions.update(component))
      store.dispatch(executeSuccessAction)

      expect(getComponent(store.getState(), componentId)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
        responses: {
          [requestId]: response,
        },
      })
    })
  })

  describe('executeFailure action', () => {
    const error: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 'request-uuid',
      error: {
        code: 403,
        message: 'Permission denied',
      },
    }
    const action = executeAction({
      requestId,
      componentId,
      method: 'jest.method',
      params: {},
    })
    const executeFailureAction = componentActions.executeFailure({
      componentId,
      action,
      requestId,
      error,
    })

    it('should not change the state if the componentId does not exist', () => {
      store.dispatch(executeFailureAction)
      expect(store.getState().components).toStrictEqual({})
    })

    it('should update the state properly including both the action request and the error response', () => {
      // Create the component first
      store.dispatch(componentActions.update(component))
      store.dispatch(executeFailureAction)

      expect(getComponent(store.getState(), componentId)).toStrictEqual({
        id: '268b4cf8-a3c5-4003-8666-3b7a4f0a5af9',
        errors: {
          [requestId]: {
            action,
            jsonrpc: error,
          },
        },
      })
    })
  })

  it('should reset to initial on destroyAction', () => {
    store.dispatch(componentActions.update(component))
    store.dispatch(
      componentActions.update({
        id: 'random',
      })
    )

    store.dispatch(destroyAction())
    expect(store.getState().components).toStrictEqual(initialComponentState)
  })
})
