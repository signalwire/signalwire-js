import { EventEmitter } from '@signalwire/core'
import { configureFullStack } from '../../testUtils'
import { createClient } from '../../client/createClient'
import { Video } from '../Video'
import { RoomSessionAPI, RoomSession } from '../RoomSession'
import { RoomSessionRecording } from './RoomSessionRecording'
import {
  decorateRecordingPromise,
  methods,
  getters,
} from './decorateRecordingPromise'

describe('RoomSessionRecording', () => {
  let video: Video
  let roomSession: RoomSession
  let recording: RoomSessionRecording

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

    recording = new RoomSessionRecording({
      payload: {
        //@ts-expect-error
        recording: {
          id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
        },
        room_session_id: roomSessionId,
      },
      roomSession,
    })
    // @ts-expect-error
    recording._client.execute = jest.fn()
  })

  afterAll(() => {
    destroy()
  })

  it('should have an event emitter', () => {
    expect(recording['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'recording.started',
      onUpdated: 'recording.updated',
      onEnded: 'recording.ended',
    }
    expect(recording['_eventMap']).toEqual(expectedEventMap)
  })

  it('should control an active recording', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        room_session_id: 'room-session-id',
        recording_id: 'c22d7223-5a01-49fe-8da0-46bec8e75e32',
      },
    }
    await recording.pause()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.pause',
    })
    await recording.resume()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.resume',
    })
    await recording.stop()
    // @ts-expect-error
    expect(recording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'video.recording.stop',
    })
  })

  it('should throw an error on methods if recording has ended', async () => {
    recording.setPayload({
      // @ts-expect-error
      recording: {
        state: 'completed',
      },
    })

    await expect(recording.pause()).rejects.toThrowError('Action has ended')
    await expect(recording.resume()).rejects.toThrowError('Action has ended')
    await expect(recording.stop()).rejects.toThrowError('Action has ended')
  })

  describe('decorateRecordingPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(recording)

      const decoratedPromise = decorateRecordingPromise.call(
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
      const innerPromise = Promise.resolve(recording)

      const decoratedPromise = decorateRecordingPromise.call(
        roomSession,
        innerPromise
      )

      // Simulate the recording ended event
      roomSession.emit('recording.ended', recording)

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

    it('resolves when recording ends', async () => {
      const innerPromise = Promise.resolve(recording)

      const decoratedPromise = decorateRecordingPromise.call(
        roomSession,
        innerPromise
      )

      // Simulate the recording ended event
      roomSession.emit('recording.ended', recording)

      await expect(decoratedPromise).resolves.toEqual(
        expect.any(RoomSessionRecording)
      )
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Recording failed'))

      const decoratedPromise = decorateRecordingPromise.call(
        roomSession,
        innerPromise
      )

      await expect(decoratedPromise).rejects.toThrow('Recording failed')
    })
  })
})
