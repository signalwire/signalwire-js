import { EventEmitter } from '@signalwire/core'
import { createClient } from '../../client/createClient'
import { CallPlayback } from './CallPlayback'
import { Call } from '../Call'
import { Voice } from '../Voice'

describe('CallPlayback', () => {
  let voice: Voice
  let call: Call
  let callPlayback: CallPlayback

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

    callPlayback = new CallPlayback({
      call,
      // @ts-expect-error
      payload: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
      },
    })

    // @ts-expect-error
    callPlayback._client.execute = jest.fn()
  })

  it('should have an event emitter', () => {
    expect(callPlayback['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onStarted: 'playback.started',
      onUpdated: 'playback.updated',
      onFailed: 'playback.failed',
      onEnded: 'playback.ended',
    }
    expect(callPlayback['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    callPlayback = new CallPlayback({
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
    expect(callPlayback.emitter.eventNames()).toStrictEqual([
      'playback.started',
      'playback.updated',
      'playback.failed',
      'playback.ended',
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
    await callPlayback.pause()
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.pause',
    })

    await callPlayback.resume()
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.resume',
    })

    await callPlayback.stop()
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      ...baseExecuteParams,
      method: 'calling.play.stop',
    })

    await callPlayback.setVolume(2)
    // @ts-expect-error
    expect(callPlayback._client.execute).toHaveBeenLastCalledWith({
      method: 'calling.play.volume',
      params: {
        control_id: 'test_control_id',
        call_id: 'test_call_id',
        node_id: 'test_node_id',
        volume: 2,
      },
    })
  })
})
