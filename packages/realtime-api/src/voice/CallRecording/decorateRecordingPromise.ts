import {
  CallingCallRecordEndState,
  CallingCallPlayState,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallRecording } from './CallRecording'
import { decoratePromise } from '../decoratePromise'

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

export interface CallRecordingPromise extends Promise<CallRecordingEnded> {
  onStarted: () => Promise<CallRecording>
  onEnded: () => Promise<CallRecordingEnded>
  pause: () => Promise<CallRecording>
  resume: () => Promise<CallRecording>
  stop: () => Promise<CallRecording>
  setVolume: () => Promise<CallRecording>
  id: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  state: Promise<CallingCallPlayState>
  url: Promise<string | undefined>
  duration: Promise<number | undefined>
  record: Promise<any>
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

export const methods = ['pause', 'resume', 'stop']

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
