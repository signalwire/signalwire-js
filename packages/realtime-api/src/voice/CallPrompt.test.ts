import { EventEmitter } from '@signalwire/core'
import { createClient } from '../client/createClient'
import { CallPrompt } from './CallPrompt'
import { Call } from './Call'
import { Voice } from './Voice'

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
})
