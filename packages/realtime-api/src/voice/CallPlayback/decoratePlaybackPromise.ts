import {
  CallingCallPlayEndState,
  CallingCallPlayState,
  Promisify,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallPlayback } from './CallPlayback'
import { decoratePromise } from '../../decoratePromise'
import { CallPlaybackListeners } from '../../types'

export interface CallPlaybackEnded {
  id: string
  volume: number
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallPlayEndState
}

export interface CallPlaybackPromise
  extends Promise<CallPlaybackEnded>,
    Omit<Promisify<CallPlaybackEnded>, 'state'> {
  onStarted: () => Promise<CallPlayback>
  onEnded: () => Promise<CallPlaybackEnded>
  listen: (listeners: CallPlaybackListeners) => Promise<() => Promise<void>>
  pause: () => Promise<CallPlayback>
  resume: () => Promise<CallPlayback>
  stop: () => Promise<CallPlayback>
  setVolume: () => Promise<CallPlayback>
  ended: () => Promise<CallPlayback>
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
