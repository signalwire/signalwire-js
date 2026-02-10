import {
  CallingCallRecordEndState,
  CallingCallRecordState,
  Promisify,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallRecording } from './CallRecording'
import { decoratePromise } from '../../decoratePromise'
import { CallRecordingListeners } from '../../types'

export interface CallRecordingEnded {
  id: string
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallRecordEndState
  url: string | undefined
  duration: number | undefined
  record: any
}

export interface CallRecordingPromise
  extends Promise<CallRecordingEnded>,
    Omit<Promisify<CallRecordingEnded>, 'state'> {
  onStarted: () => Promise<CallRecording>
  onEnded: () => Promise<CallRecordingEnded>
  listen: (listeners: CallRecordingListeners) => Promise<() => Promise<void>>
  pause: () => Promise<CallRecording>
  resume: () => Promise<CallRecording>
  stop: () => Promise<CallRecording>
  setVolume: () => Promise<CallRecording>
  ended: () => Promise<CallRecording>
  state: Promise<CallingCallRecordState>
}

export const getters = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'state',
  'url',
  'size',
  'duration',
  'record',
]

export const methods = ['pause', 'resume', 'stop', 'ended']

export function decorateRecordingPromise(
  this: Call,
  innerPromise: Promise<CallRecording>
) {
  // prettier-ignore
  return (decoratePromise<CallRecording, CallRecordingEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'recording',
    methods,
    getters,
  }) as CallRecordingPromise
}
