import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallPlayback } from './CallPlayback'
import { Call } from '../Call'
import { Voice } from '../Voice'
import {
  decoratePlaybackPromise,
  methods,
  getters,
} from './decoratePlaybackPromise'

describe('CallPlayback', () => {
  let voice: Voice
  let call: Call
  let callPlayback: CallPlayback

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

    callPlayback = new CallPlayback({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callPlayback._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callPlayback['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'playback.started',
      onUpdated: 'playback.updated',
      onFailed: 'playback.failed',
      onEnded: 'playback.ended',
    }
    expect(callPlayback['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callPlayback = new CallPlayback({
      call,
      // @ts-expect-error
      payload: {},
      listeners: {
        onStarted: () => {},
        onUpdated: () => {},
        onFailed: () => {},
        onEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(callPlayback.emitter.eventNames()).toStrictEqual([
      'playback.started',
      'playback.updated',
      'playback.failed',
      'playback.ended',
    ])
  })

  it('should control an active playback', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    }
    await callPlayback.pause()
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.pause',
    })

    await callPlayback.resume()

    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.resume',
    })

    await callPlayback.stop()
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.stop',
    })

    await callPlayback.setVolume(2)
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.play.volume',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
        volume: 2,
      },
    })
  })

  it('should throw an error on methods if playback has ended', async () => {
    callPlayback.setPayload({
      control_id: 'test_control_id',
      call_id: 'test_call_id',
      node_id: 'test_node_id',
      state: 'finished',
    })

    await expect(callPlayback.pause()).rejects.toThrowError('Action has ended')
    await expect(callPlayback.resume()).rejects.toThrowError('Action has ended')
    await expect(callPlayback.stop()).rejects.toThrowError('Action has ended')
    await expect(callPlayback.setVolume(1)).rejects.toThrowError(
      'Action has ended'
    )
  })

  describe('decoratePlaybackPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callPlayback)

      const decoratedPromise = decoratePlaybackPromise.call(call, innerPromise)

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
      const innerPromise = Promise.resolve(callPlayback)

      const decoratedPromise = decoratePlaybackPromise.call(call, innerPromise)

      // Simulate the playback ended event
      call.emit('playback.ended', callPlayback)

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

    it('resolves when playback ends', async () => {
      const innerPromise = Promise.resolve(callPlayback)

      const decoratedPromise = decoratePlaybackPromise.call(call, innerPromise)

      // Simulate the playback ended event
      call.emit('playback.ended', callPlayback)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallPlayback))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Recording failed'))

      const decoratedPromise = decoratePlaybackPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Recording failed')
    })
  })
})
