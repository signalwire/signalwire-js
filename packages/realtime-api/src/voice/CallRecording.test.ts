import { EventEmitter } from '@signalwire/core'
import { createClient } from '../client/createClient'
import { CallRecording } from './CallRecording'
import { Call } from './Call'
import { Voice } from './Voice'

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
        onFailed: () => {},
        onEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(callRecording.emitter.eventNames()).toStrictEqual([
      'recording.started',
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

    await callRecording.stop()
    // @ts-expect-error
    expect(callRecording._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.record.stop',
    })
  })
})
