import { EventEmitter } from '@signalwire/core'
import { createClient } from '../client/createClient'
import { CallTap } from './CallTap'
import { Call } from './Call'
import { Voice } from './Voice'

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
})
