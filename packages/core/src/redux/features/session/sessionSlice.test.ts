import { Store } from 'redux'
import { configureJestStore, bladeConnectResultVRT } from '../../../testUtils'
import { sessionActions, initialSessionState } from './sessionSlice'
import { destroyAction } from '../../actions'

describe('SessionState Tests', () => {
  let store: Store

  beforeEach(() => {
    store = configureJestStore()
  })

  it('should seed SessionState on sessionActions.connected action', () => {
    store.dispatch(sessionActions.connected(bladeConnectResultVRT))

    expect(store.getState().session).toStrictEqual({
      protocol: bladeConnectResultVRT.protocol,
      iceServers: bladeConnectResultVRT.iceServers,
      authStatus: 'authorized',
      authError: undefined,
      authCount: 1,
    })
  })

  it('should reset to initial on destroyAction', () => {
    store.dispatch(sessionActions.connected(bladeConnectResultVRT))

    store.dispatch(destroyAction())
    expect(store.getState().session).toStrictEqual(initialSessionState)
  })
})
