import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallPrompt } from './CallPrompt'
import { Call } from '../Call'
import { Voice } from '../Voice'
import {
  decoratePromptPromise,
  getters,
  methods,
} from './decoratePromptPromise'

describe('CallPrompt', () => {
  let voice: Voice
  let call: Call
  let callPrompt: CallPrompt

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

    callPrompt = new CallPrompt({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callPrompt._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callPrompt['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'prompt.started',
      onUpdated: 'prompt.updated',
      onFailed: 'prompt.failed',
      onEnded: 'prompt.ended',
    }
    expect(callPrompt['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callPrompt = new CallPrompt({
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
    expect(callPrompt.emitter.eventNames()).toStrictEqual([
      'prompt.started',
      'prompt.updated',
      'prompt.failed',
      'prompt.ended',
    ])
  })

  it('should control an active prompt', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    }

    await callPrompt.stop()
    // @ts-expect-error
    expect(callPrompt._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play_and_collect.stop',
    })

    await callPrompt.setVolume(5)
    // @ts-expect-error
    expect(callPrompt._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.play_and_collect.volume',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
        volume: 5,
      },
    })
  })

  it('should throw an error on methods if prompt has ended', async () => {
    callPrompt.setPayload({
      control_id: 'test_control_id',
      call_id: 'test_call_id',
      node_id: 'test_node_id',
      // @ts-expect-error
      result: { type: 'speech' },
    })

    await expect(callPrompt.stop()).rejects.toThrowError('Action has ended')
    await expect(callPrompt.setVolume(1)).rejects.toThrowError(
      'Action has ended'
    )
  })

  describe('decoratePromptPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callPrompt)

      const decoratedPromise = decoratePromptPromise.call(call, innerPromise)

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
      const innerPromise = Promise.resolve(callPrompt)

      const decoratedPromise = decoratePromptPromise.call(call, innerPromise)

      // Simulate the prompt ended event
      call.emit('prompt.ended', callPrompt)

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

    it('resolves when prompt ends', async () => {
      const innerPromise = Promise.resolve(callPrompt)

      const decoratedPromise = decoratePromptPromise.call(call, innerPromise)

      // Simulate the prompt ended event
      call.emit('prompt.ended', callPrompt)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallPrompt))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Recording failed'))

      const decoratedPromise = decoratePromptPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Recording failed')
    })
  })
})
