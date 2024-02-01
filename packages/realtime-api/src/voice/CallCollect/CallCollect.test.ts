import { createClient } from '../../client/createClient'
import { CallCollect } from './CallCollect'
import { Call } from '../Call'
import { Voice } from '../Voice'
import { EventEmitter } from '@signalwire/core'
import {
  decorateCollectPromise,
  methods,
  getters,
} from './decorateCollectPromise'

describe('CallCollect', () => {
  let voice: Voice
  let call: Call
  let callCollect: CallCollect

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

    callCollect = new CallCollect({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callCollect._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callCollect['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'collect.started',
      onInputStarted: 'collect.startOfInput',
      onUpdated: 'collect.updated',
      onFailed: 'collect.failed',
      onEnded: 'collect.ended',
    }
    expect(callCollect['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    // @ts-expect-error
    callCollect = new CallCollect({
      call,
      listeners: {
        onStarted: () => {},
        onInputStarted: () => {},
        onUpdated: () => {},
        onFailed: () => {},
        onEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(callCollect.emitter.eventNames()).toStrictEqual([
      'collect.started',
      'collect.startOfInput',
      'collect.updated',
      'collect.failed',
      'collect.ended',
    ])
  })

  it('should control an active collect action', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    }

    await callCollect.stop()
    // @ts-expect-error
    expect(callCollect._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.collect.stop',
    })

    await callCollect.startInputTimers()
    // @ts-expect-error
    expect(callCollect._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.collect.start_input_timers',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })
  })

  it('should throw an error on methods if collect has ended', async () => {
    callCollect.setPayload({
      control_id: 'test_control_id',
      call_id: 'test_call_id',
      node_id: 'test_node_id',
      result: {
        type: 'error',
      },
    })

    await expect(callCollect.stop()).rejects.toThrowError('Action has ended')
    await expect(callCollect.startInputTimers()).rejects.toThrowError(
      'Action has ended'
    )
  })

  describe('decorateCollectPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callCollect)

      const decoratedPromise = decorateCollectPromise.call(call, innerPromise)

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
      const innerPromise = Promise.resolve(callCollect)

      const decoratedPromise = decorateCollectPromise.call(call, innerPromise)

      // Simulate the collect ended event
      call.emit('collect.ended', callCollect)

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

    it('resolves when collect ends', async () => {
      const innerPromise = Promise.resolve(callCollect)

      const decoratedPromise = decorateCollectPromise.call(call, innerPromise)

      // Simulate the collect ended event
      call.emit('collect.ended', callCollect)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallCollect))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Tap failed'))

      const decoratedPromise = decorateCollectPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Tap failed')
    })
  })
})
