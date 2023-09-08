import { createClient } from '../client/createClient'
import { CallCollect } from './CallCollect'
import { Call } from './Call'
import { Voice } from './Voice'
import { EventEmitter } from '@signalwire/core'

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
})
