import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallTap } from './CallTap'
import { Call } from '../Call'
import { Voice } from '../Voice'
import { decorateTapPromise, methods, getters } from './decorateTapPromise'

describe('CallTap', () => {
  let voice: Voice
  let call: Call
  let callTap: CallTap

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

    callTap = new CallTap({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callTap._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callTap['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'tap.started',
      onEnded: 'tap.ended',
    }
    expect(callTap['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callTap = new CallTap({
      call,
      // @ts-expect-error
      payload: {},
      listeners: {
        onStarted: () => {},
        onEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(callTap.emitter.eventNames()).toStrictEqual([
      'tap.started',
      'tap.ended',
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

    await callTap.stop()
    // @ts-expect-error
    expect(callTap._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.tap.stop',
    })
  })

  it('should update the attributes on setPayload call', () => {
    const newCallId = 'new_call_id'
    const newNodeId = 'new_node_id'
    const newControlId = 'new_control_id'

    // @ts-expect-error
    callTap.setPayload({
      call_id: newCallId,
      node_id: newNodeId,
      control_id: newControlId,
    })

    expect(callTap.callId).toBe(newCallId)
    expect(callTap.nodeId).toBe(newNodeId)
    expect(callTap.controlId).toBe(newControlId)
  })

  it('should throw an error on methods if tap has ended', async () => {
    // @ts-expect-error
    callTap.setPayload({
      control_id: 'test_control_id',
      call_id: 'test_call_id',
      node_id: 'test_node_id',
      state: 'finished',
    })

    await expect(callTap.stop()).rejects.toThrowError('Action has ended')
  })

  describe('decorateTapPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callTap)

      const decoratedPromise = decorateTapPromise.call(call, innerPromise)

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
      const innerPromise = Promise.resolve(callTap)

      const decoratedPromise = decorateTapPromise.call(call, innerPromise)

      // Simulate the tap ended event
      call.emit('tap.ended', callTap)

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

    it('resolves when tap ends', async () => {
      const innerPromise = Promise.resolve(callTap)

      const decoratedPromise = decorateTapPromise.call(call, innerPromise)

      // Simulate the tap ended event
      call.emit('tap.ended', callTap)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallTap))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Tap failed'))

      const decoratedPromise = decorateTapPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Tap failed')
    })
  })
})
