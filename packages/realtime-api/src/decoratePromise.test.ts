import { Voice } from './voice/Voice'
import { Call } from './voice/Call'
import { decoratePromise, DecoratePromiseOptions } from './decoratePromise'
import { createClient } from './client/createClient'
import { Video } from './video/Video'
import { RoomSession } from './video/RoomSession'

class MockApi {
  _ended: boolean = false

  get hasEnded() {
    return this._ended
  }

  get getter1() {
    return 'getter1'
  }

  get getter2() {
    return 'getter2'
  }

  method1() {}

  method2() {}
}

describe('decoratePromise', () => {
  describe('Voice Call', () => {
    let voice: Voice
    let call: Call

    const userOptions = {
      host: 'example.com',
      project: 'example.project',
      token: 'example.token',
    }
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }

    beforeEach(() => {
      // @ts-expect-error
      voice = new Voice(swClientMock)

      call = new Call({ voice })
    })

    it('should decorate a promise correctly', async () => {
      const mockInnerPromise = Promise.resolve(new MockApi())

      const options: DecoratePromiseOptions<MockApi> = {
        promise: mockInnerPromise,
        namespace: 'playback',
        methods: ['method1', 'method2'],
        getters: ['getter1', 'getter2'],
      }

      const decoratedPromise = decoratePromise.call(call, options)

      // All properties before the promise resolve
      expect(decoratedPromise).toHaveProperty('onStarted', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('onEnded', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('method1', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('method2', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('getter1')
      expect(decoratedPromise).toHaveProperty('getter2')

      // @ts-expect-error
      const onStarted = decoratedPromise.onStarted()
      expect(onStarted).toBeInstanceOf(Promise)
      expect(await onStarted).toBeInstanceOf(MockApi)

      // @ts-expect-error
      const onEnded = decoratedPromise.onEnded()
      expect(onEnded).toBeInstanceOf(Promise)
      // @ts-expect-error
      call.emit('playback.ended', new MockApi())
      expect(await onEnded).toBeInstanceOf(MockApi)

      const resolved = await decoratedPromise

      // All properties after the promise resolve
      expect(resolved).not.toHaveProperty('onStarted', expect.any(Function))
      expect(resolved).not.toHaveProperty('onEnded', expect.any(Function))
      expect(resolved).toHaveProperty('method1', expect.any(Function))
      expect(resolved).toHaveProperty('method2', expect.any(Function))
      expect(resolved).toHaveProperty('getter1')
      expect(resolved).toHaveProperty('getter2')
    })
  })

  describe('Video RoomSession', () => {
    let video: Video
    let roomSession: RoomSession

    const userOptions = {
      host: 'example.com',
      project: 'example.project',
      token: 'example.token',
    }
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }

    beforeEach(() => {
      // @ts-expect-error
      video = new Voice(swClientMock)
      // @ts-expect-error
      roomSession = new RoomSession({ video, payload: {} })
    })

    it('should decorate a promise correctly', async () => {
      const mockInnerPromise = Promise.resolve(new MockApi())

      const options: DecoratePromiseOptions<MockApi> = {
        promise: mockInnerPromise,
        namespace: 'playback',
        methods: ['method1', 'method2'],
        getters: ['getter1', 'getter2'],
      }

      const decoratedPromise = decoratePromise.call(roomSession, options)

      // All properties before the promise resolve
      expect(decoratedPromise).toHaveProperty('onStarted', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('onEnded', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('method1', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('method2', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('getter1')
      expect(decoratedPromise).toHaveProperty('getter2')

      // @ts-expect-error
      const onStarted = decoratedPromise.onStarted()
      expect(onStarted).toBeInstanceOf(Promise)
      expect(await onStarted).toBeInstanceOf(MockApi)

      // @ts-expect-error
      const onEnded = decoratedPromise.onEnded()
      expect(onEnded).toBeInstanceOf(Promise)
      // @ts-expect-error
      roomSession.emit('playback.ended', new MockApi())
      expect(await onEnded).toBeInstanceOf(MockApi)

      const resolved = await decoratedPromise

      // All properties after the promise resolve
      expect(resolved).not.toHaveProperty('onStarted', expect.any(Function))
      expect(resolved).not.toHaveProperty('onEnded', expect.any(Function))
      expect(resolved).toHaveProperty('method1', expect.any(Function))
      expect(resolved).toHaveProperty('method2', expect.any(Function))
      expect(resolved).toHaveProperty('getter1')
      expect(resolved).toHaveProperty('getter2')
    })
  })
})
