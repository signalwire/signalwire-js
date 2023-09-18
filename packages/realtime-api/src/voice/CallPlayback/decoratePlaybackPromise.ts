import { CallingCallPlayEndState, CallingCallPlayState } from '@signalwire/core'
import { Call } from '../Call'
import { CallPlayback } from './CallPlayback'
import { decoratePromise } from '../decoratePromise'
import { CallPlaybackListeners } from '../../types'

// In future, we can have a playback instance without methods (for eg: StaticCallPlayback)
// When playback ends, we would return StaticCallPlayback to the user
// For now; force TS to have only getters properties when playback ends
export interface CallPlaybackEnded {
  id: string
  volume: number
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallPlayEndState
}

export interface CallPlaybackPromise extends Promise<CallPlaybackEnded> {
  onStarted: () => Promise<CallPlayback>
  onEnded: () => Promise<CallPlaybackEnded>
  listen: (listeners: CallPlaybackListeners) => Promise<() => Promise<void>>
  pause: () => Promise<CallPlayback>
  resume: () => Promise<CallPlayback>
  stop: () => Promise<CallPlayback>
  setVolume: () => Promise<CallPlayback>
  ended: () => Promise<CallPlayback>
  id: Promise<string>
  volume: Promise<number>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  state: Promise<CallingCallPlayState>
}

export const getters = [
  'id',
  'volume',
  'callId',
  'nodeId',
  'controlId',
  'state',
]

export const methods = ['pause', 'resume', 'stop', 'setVolume', 'ended']

export function decoratePlaybackPromise(
  this: Call,
  innerPromise: Promise<CallPlayback>
) {
  // prettier-ignore
  return (decoratePromise<CallPlayback, CallPlaybackEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'playback',
    methods,
    getters,
  }) as CallPlaybackPromise
}
