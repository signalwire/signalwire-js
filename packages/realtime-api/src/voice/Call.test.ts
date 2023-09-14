import { EventEmitter } from '@signalwire/core'
import { createClient } from '../client/createClient'
import { Voice } from './Voice'
import { Call } from './Call'

describe('Call', () => {
  let voice: Voice
  let call: Call

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
  })

  it('should have an event emitter', () => {
    call = new Call({ voice })

    expect(call['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    call = new Call({ voice })

    const expectedEventMap = {
      onStateChanged: 'call.state',
      onPlaybackStarted: 'playback.started',
      onPlaybackUpdated: 'playback.updated',
      onPlaybackFailed: 'playback.failed',
      onPlaybackEnded: 'playback.ended',
      onRecordingStarted: 'recording.started',
      onRecordingUpdated: 'recording.updated',
      onRecordingFailed: 'recording.failed',
      onRecordingEnded: 'recording.ended',
      onPromptStarted: 'prompt.started',
      onPromptUpdated: 'prompt.updated',
      onPromptFailed: 'prompt.failed',
      onPromptEnded: 'prompt.ended',
      onCollectStarted: 'collect.started',
      onCollectInputStarted: 'collect.startOfInput',
      onCollectUpdated: 'collect.updated',
      onCollectFailed: 'collect.failed',
      onCollectEnded: 'collect.ended',
      onTapStarted: 'tap.started',
      onTapEnded: 'tap.ended',
      onDetectStarted: 'detect.started',
      onDetectUpdated: 'detect.updated',
      onDetectEnded: 'detect.ended',
    }
    expect(call['_eventMap']).toEqual(expectedEventMap)
  })

  it('should attach all listeners', () => {
    call = new Call({
      voice,
      listeners: {
        onStateChanged: () => {},
        onPlaybackStarted: () => {},
        onPlaybackUpdated: () => {},
        onPlaybackFailed: () => {},
        onPlaybackEnded: () => {},
        onRecordingStarted: () => {},
        onRecordingFailed: () => {},
        onRecordingEnded: () => {},
        onPromptStarted: () => {},
        onPromptUpdated: () => {},
        onPromptFailed: () => {},
        onPromptEnded: () => {},
        onCollectStarted: () => {},
        onCollectInputStarted: () => {},
        onCollectUpdated: () => {},
        onCollectFailed: () => {},
        onCollectEnded: () => {},
        onTapStarted: () => {},
        onTapEnded: () => {},
        onDetectStarted: () => {},
        onDetectUpdated: () => {},
        onDetectEnded: () => {},
      },
    })

    // @ts-expect-error
    expect(call.emitter.eventNames()).toStrictEqual([
      'call.state',
      'playback.started',
      'playback.updated',
      'playback.failed',
      'playback.ended',
      'recording.started',
      'recording.failed',
      'recording.ended',
      'prompt.started',
      'prompt.updated',
      'prompt.failed',
      'prompt.ended',
      'collect.started',
      'collect.startOfInput',
      'collect.updated',
      'collect.failed',
      'collect.ended',
      'tap.started',
      'tap.ended',
      'detect.started',
      'detect.updated',
      'detect.ended',
    ])
  })
})
