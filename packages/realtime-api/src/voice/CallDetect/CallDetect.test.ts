import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallDetect } from './CallDetect'
import { Call } from '../Call'
import { Voice } from '../Voice'
import {
  decorateDetectPromise,
  methods,
  getters,
} from './decorateDetectPromise'

describe('CallDetect', () => {
  let voice: Voice
  let call: Call
  let callDetect: CallDetect

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

    callDetect = new CallDetect({
      call,
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callDetect._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callDetect['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'detect.started',
      onUpdated: 'detect.updated',
      onEnded: 'detect.ended',
    }
    expect(callDetect['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callDetect = new CallDetect({
      call,
      // @ts-expect-error
      payload: {},
      listeners: {
        onStarted: () => {},
        onUpdated: () => {},
        onEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(callDetect.emitter.eventNames()).toStrictEqual([
      'detect.started',
      'detect.updated',
      'detect.ended',
    ])
  })

  it('should stop the detection', async () => {
    const baseExecuteParams = {
      method: '',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    }

    await callDetect.stop()
    // @ts-expect-error
    expect(callDetect._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.detect.stop',
    })
  })

  it('should throw an error on methods if detect has ended', async () => {
    const hasEndedGetter = jest.spyOn(callDetect, 'hasEnded', 'get')

    // Define the behavior you want for the getter
    hasEndedGetter.mockReturnValue(true)

    await expect(callDetect.stop()).rejects.toThrowError('Action has ended')
  })

  describe('decorateDetectPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callDetect)

      const decoratedPromise = decorateDetectPromise.call(call, innerPromise)

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
      const innerPromise = Promise.resolve(callDetect)

      const decoratedPromise = decorateDetectPromise.call(call, innerPromise)

      // Simulate the detect ended event
      call.emit('detect.ended', callDetect)

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

    it('resolves when detect ends', async () => {
      const innerPromise = Promise.resolve(callDetect)

      const decoratedPromise = decorateDetectPromise.call(call, innerPromise)

      // Simulate the detect ended event
      call.emit('detect.ended', callDetect)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallDetect))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Tap failed'))

      const decoratedPromise = decorateDetectPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Tap failed')
    })
  })
})
