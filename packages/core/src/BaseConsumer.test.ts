import { BaseConsumer, connect, EventEmitter } from '.'
import type { SDKStore } from './redux'
import { configureJestStore } from './testUtils'

describe('BaseConsumer', () => {
  describe('subscribe', () => {
    let store: SDKStore
    let instance: any

    beforeEach(() => {
      store = configureJestStore()
      instance = connect({
        store,
        componentListeners: {
          errors: 'onError',
          responses: 'onSuccess',
        },
        Component: BaseConsumer,
      })({
        emitter: new EventEmitter(),
      })
      instance.execute = jest.fn()
      instance._attachListeners(instance.__uuid)
    })

    it('should be idempotent', () => {
      instance.on('something-1', () => {})
      instance.on('something-2', () => {})
      instance.on('something-2', () => {})

      instance.subscribe()
      instance.subscribe()
      instance.subscribe()
      instance.subscribe()
      instance.subscribe()
      expect(instance.execute).toHaveBeenCalledTimes(1)
    })
  })
})
