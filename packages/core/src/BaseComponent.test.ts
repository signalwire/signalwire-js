import { BaseComponent } from './BaseComponent'
import { configureJestStore } from './testUtils'
import { EventEmitter } from './utils/EventEmitter'

describe('BaseComponent', () => {
  describe('as an event emitter', () => {
    class JestComponent extends BaseComponent {
      protected _eventsPrefix = 'video' as const

      constructor(namespace = '') {
        super({
          store: configureJestStore(),
          emitter: new EventEmitter(),
        })

        this._attachListeners(namespace)
      }
    }

    let instance: BaseComponent

    beforeEach(() => {
      instance = new JestComponent()
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
  })
})
