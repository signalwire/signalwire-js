import { Store } from 'redux'
import { configureJestStore, rpcConnectResultVRT } from '../../../testUtils'
import { sessionActions, initialSessionState } from './sessionSlice'
import { destroyAction } from '../../actions'

describe('SessionState Tests', () => {
  let store: Store

  beforeEach(() => {
    store = configureJestStore()
  })

  it('should seed SessionState on sessionActions.connected action', () => {
    store.dispatch(sessionActions.connected(rpcConnectResultVRT))

    expect(store.getState().session).toStrictEqual({
      protocol: rpcConnectResultVRT.protocol,
      iceServers: rpcConnectResultVRT.ice_servers,
      authStatus: 'authorized',
      authError: undefined,
      authCount: 1,
    })
  })

  it('should reset to initial on destroyAction', () => {
    store.dispatch(sessionActions.connected(rpcConnectResultVRT))

    store.dispatch(destroyAction())
    expect(store.getState().session).toStrictEqual(initialSessionState)
  })
})
