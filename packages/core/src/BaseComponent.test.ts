import { BaseComponent } from './BaseComponent'
import { configureJestStore } from './testUtils'

describe('BaseComponent', () => {
  describe('as an event emitter', () => {
    class JestComponent extends BaseComponent<any> {
      constructor() {
        super({
          store: configureJestStore(),
        })
      }
    }

    let instance: BaseComponent<any>

    beforeEach(() => {
      instance = new JestComponent()
    })

    it('should remove the listeners with .off', () => {
      const instance = new JestComponent()
      const mockOne = jest.fn()
      instance.on('test.eventOne', mockOne)
      instance.once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance.on('test.eventTwo', mockTwo)
      instance.once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('test.eventOne')).toEqual(2)
      expect(instance.listenerCount('test.eventTwo')).toEqual(2)

      expect(instance.eventNames()).toStrictEqual([
        'test.eventOne',
        'test.eventTwo',
      ])

      // No-op
      instance.off('test.eventOne', () => {})
      expect(instance.listenerCount('test.eventOne')).toEqual(2)

      instance.off('test.eventOne', mockOne)
      expect(instance.listenerCount('test.eventOne')).toEqual(0)

      instance.off('test.eventTwo', mockTwo)
      expect(instance.listenerCount('test.eventTwo')).toEqual(0)

      expect(instance.eventNames()).toStrictEqual([])
    })

    it('should remove all the listeners with .removeAllListeners', () => {
      const instance = new JestComponent()
      const mockOne = jest.fn()
      instance.on('test.eventOne', mockOne)
      instance.once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance.on('test.eventTwo', mockTwo)
      instance.once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('test.eventOne')).toEqual(2)
      expect(instance.listenerCount('test.eventTwo')).toEqual(2)

      expect(instance.eventNames()).toStrictEqual([
        'test.eventOne',
        'test.eventTwo',
      ])

      instance.removeAllListeners()

      expect(instance.listenerCount('test.eventOne')).toEqual(0)
      expect(instance.listenerCount('test.eventTwo')).toEqual(0)
      expect(instance.eventNames()).toStrictEqual([])
    })

    it('should handle snake_case events', (done) => {
      const serverEvent = 'event.server_side'
      const payload = { test: 1 }
      instance.on('event.server_side', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emitter.emit(serverEvent, payload)
    })

    it('should handle camelCase events', (done) => {
      const serverEvent = 'event.serverSide'
      const payload = { test: 1 }
      instance.on('event.serverSide', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emitter.emit(serverEvent, payload)
    })
  })
})
