import { BaseComponent } from './BaseComponent'
import { configureJestStore } from './testUtils'
import { EventEmitter } from './utils/EventEmitter'

describe('BaseComponent', () => {
  describe('as an event emitter', () => {
    class JestComponent extends BaseComponent<any> {
      constructor(namespace = '') {
        super({
          store: configureJestStore(),
          emitter: new EventEmitter(),
        })

        this._attachListeners(namespace)
      }
    }

    let instance: BaseComponent<any>

    beforeEach(() => {
      instance = new JestComponent()
    })

    it('should remove the listeners with .off', () => {
      const instance = new JestComponent('custom')
      const mockOne = jest.fn()
      instance._on('test.eventOne', mockOne)
      instance._once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance._on('test.eventTwo', mockTwo)
      instance._once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('test.eventOne')).toEqual(2)
      expect(instance.listenerCount('test.eventTwo')).toEqual(2)

      expect(instance.baseEventNames()).toStrictEqual([
        'test.eventOne',
        'test.eventTwo',
      ])

      // No-op
      instance._off('test.eventOne', () => {})
      expect(instance.listenerCount('test.eventOne')).toEqual(2)

      instance._off('test.eventOne', mockOne)
      expect(instance.listenerCount('test.eventOne')).toEqual(0)

      instance._off('test.eventTwo', mockTwo)
      expect(instance.listenerCount('test.eventTwo')).toEqual(0)

      expect(instance.baseEventNames()).toStrictEqual([])
    })

    it('should remove all the listeners with .removeAllListeners', () => {
      const instance = new JestComponent('custom')
      const mockOne = jest.fn()
      instance._on('test.eventOne', mockOne)
      instance._once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance._on('test.eventTwo', mockTwo)
      instance._once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('test.eventOne')).toEqual(2)
      expect(instance.listenerCount('test.eventTwo')).toEqual(2)

      expect(instance.baseEventNames()).toStrictEqual([
        'test.eventOne',
        'test.eventTwo',
      ])

      instance.removeAllListeners()

      expect(instance.listenerCount('test.eventOne')).toEqual(0)
      expect(instance.listenerCount('test.eventTwo')).toEqual(0)
      expect(instance.baseEventNames()).toStrictEqual([])
    })

    it('should handle snake_case events', (done) => {
      const serverEvent = 'event.server_side'
      const payload = { test: 1 }
      instance._on('event.server_side', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.baseEmitter.emit(serverEvent, payload)
    })

    it('should handle camelCase events', (done) => {
      const serverEvent = 'event.serverSide'
      const payload = { test: 1 }
      instance._on('event.serverSide', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.baseEmitter.emit(serverEvent, payload)
    })
  })
})
