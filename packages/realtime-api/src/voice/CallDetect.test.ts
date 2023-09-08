import { EventEmitter } from '@signalwire/core'
import { createClient } from '../client/createClient'
import { CallDetect } from './CallDetect'
import { Call } from './Call'
import { Voice } from './Voice'

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
})
