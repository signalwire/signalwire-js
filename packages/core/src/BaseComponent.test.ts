import { BaseComponent } from './BaseComponent'
import { configureJestStore } from './testUtils'
import { EventEmitter } from './utils/EventEmitter'

describe('BaseComponent', () => {
  describe('as an event emitter', () => {
    class JestComponent extends BaseComponent<any> {
      protected _eventsPrefix = 'video' as const

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

    it('should transform the event name to the internal format', () => {
      instance.on('test.event_one', () => {})
      instance.on('test.eventOne', () => {})
      instance.once('video.test.eventOne', () => {})

      instance.once('video.test.eventTwo', () => {})

      expect(instance.listenerCount('video.test.event_one')).toEqual(3)
      expect(instance.listenerCount('video.test.event_two')).toEqual(1)
    })

    it('should transform the event name to the internal format with namespace', () => {
      const customInstance = new JestComponent('custom')
      customInstance.on('test.event_one', () => {})
      customInstance.on('test.eventOne', () => {})
      customInstance.once('video.test.eventOne', () => {})

      customInstance.once('video.test.eventTwo', () => {})

      expect(
        customInstance.listenerCount('custom:video.test.event_one')
      ).toEqual(3)
      expect(
        customInstance.listenerCount('custom:video.test.event_two')
      ).toEqual(1)
    })

    it('should keep track of the original events with the _eventsPrefix', () => {
      const firstInstance = new JestComponent('first')
      firstInstance.on('first.event_one', () => {})
      firstInstance.once('video.first.eventOne', () => {})
      firstInstance.on('first.event_two', () => {})
      firstInstance.once('video.first.eventTwo', () => {})

      const secondInstance = new JestComponent('second')
      secondInstance.on('second.event_one', () => {})
      secondInstance.once('video.second.eventOne', () => {})
      secondInstance.on('second.event_two', () => {})
      secondInstance.once('video.second.eventTwo', () => {})

      expect(firstInstance.eventNames()).toStrictEqual([
        'video.first.event_one',
        'video.first.eventOne',
        'video.first.event_two',
        'video.first.eventTwo',
      ])
      expect(secondInstance.eventNames()).toStrictEqual([
        'video.second.event_one',
        'video.second.eventOne',
        'video.second.event_two',
        'video.second.eventTwo',
      ])
    })

    it('should remove the listeners with .off', () => {
      const instance = new JestComponent('custom')
      const mockOne = jest.fn()
      instance.on('test.eventOne', mockOne)
      instance.once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance.on('test.eventTwo', mockTwo)
      instance.once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('custom:video.test.event_one')).toEqual(2)
      expect(instance.listenerCount('custom:video.test.event_two')).toEqual(2)

      // _trackedEvents contains raw-prefixed event names
      expect(instance.eventNames()).toStrictEqual([
        'video.test.eventOne',
        'video.test.eventTwo',
      ])

      // No-op
      instance.off('test.eventOne', () => {})
      expect(instance.listenerCount('custom:video.test.event_one')).toEqual(2)

      instance.off('test.eventOne', mockOne)
      expect(instance.listenerCount('custom:video.test.event_one')).toEqual(0)

      instance.off('test.eventTwo', mockTwo)
      expect(instance.listenerCount('custom:video.test.event_two')).toEqual(0)

      expect(instance.eventNames()).toStrictEqual([])
    })

    it('should remove all the listeners with .removeAllListeners', () => {
      const instance = new JestComponent('custom')
      const mockOne = jest.fn()
      instance.on('test.eventOne', mockOne)
      instance.once('test.eventOne', mockOne)
      const mockTwo = jest.fn()
      instance.on('test.eventTwo', mockTwo)
      instance.once('test.eventTwo', mockTwo)

      expect(instance.listenerCount('custom:video.test.event_one')).toEqual(2)
      expect(instance.listenerCount('custom:video.test.event_two')).toEqual(2)

      // _trackedEvents contains raw-prefixed event names
      expect(instance.eventNames()).toStrictEqual([
        'video.test.eventOne',
        'video.test.eventTwo',
      ])

      instance.removeAllListeners()

      expect(instance.listenerCount('custom:video.test.event_one')).toEqual(0)
      expect(instance.listenerCount('custom:video.test.event_two')).toEqual(0)
      expect(instance.eventNames()).toStrictEqual([])
    })

    it('should handle snake_case events', (done) => {
      const serverEvent = 'video.event.server_side'
      const payload = { test: 1 }
      instance.on('event.server_side', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emit(serverEvent, payload)
    })

    it('should handle camelCase events', (done) => {
      const serverEvent = 'video.event.server_side'
      const payload = { test: 1 }
      instance.on('event.serverSide', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emit(serverEvent, payload)
    })

    it('with emitterTransforms it should transform the payload', () => {
      class CustomComponent extends JestComponent {
        protected getEmitterTransforms() {
          return new Map([
            [
              ['video.jest.snake_case', 'video.jest.camel_case'],
              {
                instanceFactory: () => {
                  return {
                    instance: this,
                    inject: 'something',
                  }
                },
                payloadTransform: (payload: any) => {
                  return {
                    transformed: 'data',
                    payload,
                  }
                },
                getInstanceEventNamespace: (_payload: any) => {
                  return 'new-namespace'
                },
                getInstanceEventChannel: (_payload: any) => {
                  return 'new-event-channel'
                },
              },
            ],
          ])
        }
      }

      const instance = new CustomComponent()
      // @ts-expect-error
      instance.applyEmitterTransforms()
      const payload = { key: 'value' }

      const mockFn = jest.fn()
      instance.on('jest.snake_case', (obj: any) => {
        expect(obj._eventsNamespace).toEqual('new-namespace')
        expect(obj.eventChannel).toEqual('new-event-channel')
        expect(obj.transformed).toEqual('data')
        expect(obj.payload).toStrictEqual(payload)
        mockFn(obj)
      })

      instance.on('jest.camelCase', (obj: any) => {
        expect(obj._eventsNamespace).toEqual('new-namespace')
        expect(obj.eventChannel).toEqual('new-event-channel')
        expect(obj.transformed).toEqual('data')
        expect(obj.payload).toStrictEqual(payload)
        mockFn(obj)
      })

      instance.emit('jest.snake_case', payload)
      instance.emit('jest.camel_case', payload)

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenNthCalledWith(1, {
        instance,
        inject: 'something',
      })
      expect(mockFn).toHaveBeenNthCalledWith(2, {
        instance,
        inject: 'something',
      })
    })
  })
})
