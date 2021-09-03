import { BaseComponent } from './BaseComponent'
import { configureJestStore } from './testUtils'
import { EventEmitter } from './utils/EventEmitter'

describe('BaseComponent', () => {
  describe('as an event emitter', () => {
    let instance: BaseComponent
    const serverEvent = 'jest.event.server_side'

    beforeEach(() => {
      instance = new BaseComponent({
        store: configureJestStore(),
        emitter: new EventEmitter(),
      })
      // @ts-expect-error
      instance._eventsPrefix = 'jest'
      // @ts-expect-error
      instance._attachListeners('')
    })

    it('should handle snake_case events', (done) => {
      const payload = { test: 1 }
      instance.on(serverEvent, (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emit(serverEvent, payload)
    })

    it('should handle camelCase events', (done) => {
      const payload = { test: 1 }
      instance.on('event.serverSide', (data) => {
        expect(data).toStrictEqual(payload)

        done()
      })

      instance.emit(serverEvent, payload)
    })
  })
})
