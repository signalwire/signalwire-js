import { EventEmitter } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSessionAPI, RoomSession } from '../RoomSession'
import { RoomSessionStream } from './RoomSessionStream'
import {
  decorateStreamPromise,
  getters,
  methods,
} from './decorateStreamPromise'

describe('RoomSessionStream', () => {
  let video: Video
  let roomSession: RoomSession
  let stream: RoomSessionStream

  const roomSessionId = 'room-session-id'
  const { store, destroy } = configureFullStack()

  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
    store,
  }

  beforeEach(() => {
    const swClientMock = {
      userOptions,
      client: createClient(userOptions),
    }
    // @ts-expect-error
    video = new Video(swClientMock)
    // @ts-expect-error
    video._client.execute = jest.fn()
    // @ts-expect-error
    video._client.runWorker = jest.fn()

    roomSession = new RoomSessionAPI({
      video,
      payload: {
        room_session: {
          id: roomSessionId,
          event_channel: 'room.e4b8baff-865d-424b-a210-4a182a3b1451',
        },
      },
    })

    stream = new RoomSessionStream({
      payload: {
        // @ts-expect-error
        stream: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
        room_session_id: roomSessionId,
      },
      roomSession,
    })
    // @ts-expect-error
    stream._client.execute = jest.fn()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(stream['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'stream.started',
      onEnded: 'stream.ended',
    }
    expect(stream['_eventMap']).toEqual(expectedEventMap)
  })

  it('should control an active stream', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        room_session_id: 'room-session-id',
        stream_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      },
    }

    await stream.stop()
    // @ts-expect-error
    expect(stream._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.stream.stop',
    })
  })

  it('should throw an error on methods if stream has ended', async () => {
    stream.setPayload({
      // @ts-expect-error
      stream: {
        state: 'completed',
      },
    })

    await expect(stream.stop()).rejects.toThrowError('Action has ended')
  })

  describe('decorateStreamPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(stream)

      const decoratedPromise = decorateStreamPromise.call(
        roomSession,
        innerPromise
      )

      expect(decoratedPromise).toHaveProperty('onStarted', expect.any(Function))
      expect(decoratedPromise.onStarted()).toBeInstanceOf(Promise)
      expect(decoratedPromise).toHaveProperty('onEnded', expect.any(Function))
      expect(decoratedPromise.onEnded()).toBeInstanceOf(Promise)
      methods.forEach((method) => {
        expect(decoratedPromise).toHaveProperty(method, expect.any(Function))
        // @ts-expect-error
        expect(decoratedPromise[method]()).toBeInstanceOf(Promise)
      })
      getters.forEach((getter) => {
        expect(decoratedPromise).toHaveProperty(getter)
        // @ts-expect-error
        expect(decoratedPromise[getter]).toBeInstanceOf(Promise)
      })
    })

    it('expose correct properties after resolve', async () => {
      const innerPromise = Promise.resolve(stream)

      const decoratedPromise = decorateStreamPromise.call(
        roomSession,
        innerPromise
      )

      // Simulate the stream ended event
      roomSession.emit('stream.ended', stream)

      const ended = await decoratedPromise

      expect(ended).not.toHaveProperty('onStarted', expect.any(Function))
      expect(ended).not.toHaveProperty('onEnded', expect.any(Function))
      methods.forEach((method) => {
        expect(ended).toHaveProperty(method, expect.any(Function))
      })
      getters.forEach((getter) => {
        expect(ended).toHaveProperty(getter)
        // @ts-expect-error
        expect(ended[getter]).not.toBeInstanceOf(Promise)
      })
    })

    it('resolves when stream ends', async () => {
      const innerPromise = Promise.resolve(stream)

      const decoratedPromise = decorateStreamPromise.call(
        roomSession,
        innerPromise
      )

      // Simulate the stream ended event
      roomSession.emit('stream.ended', stream)

      await expect(decoratedPromise).resolves.toEqual(
        expect.any(RoomSessionStream)
      )
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Recording failed'))

      const decoratedPromise = decorateStreamPromise.call(
        roomSession,
        innerPromise
      )

      await expect(decoratedPromise).rejects.toThrow('Recording failed')
    })
  })
})
