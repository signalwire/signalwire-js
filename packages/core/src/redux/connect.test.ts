import { configureJestStore } from '../testUtils'
import { BaseComponent } from '../BaseComponent'
import { connect } from './connect'
import { componentActions } from './features'
import { EventEmitter } from '../utils/EventEmitter'
import { SDKStore } from './'

describe('Connect', () => {
  let store: SDKStore
  let instance: any
  let updateStateAction: any
  let updateRemoteSDPAction: any

  beforeEach(() => {
    store = configureJestStore()
    instance = connect({
      store,
      Component: BaseComponent,
    })({
      emitter: new EventEmitter(),
    })
    instance.emit = jest.fn()

    updateStateAction = componentActions.upsert({
      id: instance.__uuid,
      state: 'active',
    })

    updateRemoteSDPAction = componentActions.upsert({
      id: instance.__uuid,
      remoteSDP: '<SDP>',
    })
  })

  it('should unsubscribe after destroy', () => {
    store.dispatch(updateStateAction)

    instance.destroy()
    instance.emit.mockClear()

    store.dispatch(updateStateAction)
    expect(instance.emit).not.toHaveBeenCalled()
  })

  it('should not invoke the instance method if something else in redux changed', () => {
    store.dispatch(updateRemoteSDPAction)
    expect(instance.emit).not.toHaveBeenCalled()
  })
})
