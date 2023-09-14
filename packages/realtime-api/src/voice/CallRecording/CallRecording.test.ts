import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallRecording } from './CallRecording'
import { Call } from '../Call'
import { Voice } from '../Voice'
import {
  decorateRecordingPromise,
  methods,
  getters,
} from './decorateRecordingPromise'

describe('CallRecording', () => {
  let voice: Voice
  let call: Call
  let callRecording: CallRecording

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

    callRecording = new CallRecording({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callRecording._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callRecording['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'recording.started',
      onUpdated: 'recording.updated',
      onFailed: 'recording.failed',
      onEnded: 'recording.ended',
    }
    expect(callRecording['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callRecording = new CallRecording({
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
    expect(callRecording.emitter.eventNames()).toStrictEqual([
      'recording.started',
      'recording.updated',
      'recording.failed',
      'recording.ended',
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

    await callRecording.pause()
    // @ts-expect-error
    expect(callRecording._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.record.pause',
      params: {
        ...baseExecuteParams.params,
        behavior: 'silence',
      },
    })

    await callRecording.pause({ behavior: 'skip' })
    // @ts-expect-error
    expect(callRecording._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.record.pause',
      params: {
        ...baseExecuteParams.params,
        behavior: 'skip',
      },
    })

    await callRecording.resume()
    // @ts-expect-error
    expect(callRecording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.record.resume',
    })

    await callRecording.stop()
    // @ts-expect-error
    expect(callRecording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.record.stop',
    })
  })

  describe('decorateRecordingPromise', () => {
    it('expose correct properties before resolve', () => {
      const innerPromise = Promise.resolve(callRecording)

      const decoratedPromise = decorateRecordingPromise.call(call, innerPromise)

      expect(decoratedPromise).toHaveProperty('onStarted', expect.any(Function))
      expect(decoratedPromise).toHaveProperty('onEnded', expect.any(Function))
      methods.forEach((method) => {
        expect(decoratedPromise).toHaveProperty(method, expect.any(Function))
      })
      getters.forEach((getter) => {
        expect(decoratedPromise).toHaveProperty(getter)
      })
    })

    it('expose correct properties after resolve', async () => {
      const innerPromise = Promise.resolve(callRecording)

      const decoratedPromise = decorateRecordingPromise.call(call, innerPromise)

      // Simulate the recording ended event
      call.emit('recording.ended', callRecording)

      const ended = await decoratedPromise

      expect(ended).not.toHaveProperty('onStarted', expect.any(Function))
      expect(ended).not.toHaveProperty('onEnded', expect.any(Function))
      methods.forEach((method) => {
        expect(ended).toHaveProperty(method, expect.any(Function))
      })
      getters.forEach((getter) => {
        expect(ended).toHaveProperty(getter)
      })
    })

    it('resolves when recording ends', async () => {
      const innerPromise = Promise.resolve(callRecording)

      const decoratedPromise = decorateRecordingPromise.call(call, innerPromise)

      // Simulate the recording ended event
      call.emit('recording.ended', callRecording)

      await expect(decoratedPromise).resolves.toEqual(expect.any(CallRecording))
    })

    it('rejects on inner promise rejection', async () => {
      const innerPromise = Promise.reject(new Error('Recording failed'))

      const decoratedPromise = decorateRecordingPromise.call(call, innerPromise)

      await expect(decoratedPromise).rejects.toThrow('Recording failed')
    })
  })
})
