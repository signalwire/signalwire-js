import { CallingCallCollectResult } from '@signalwire/core'
import { Call } from '../Call'
import { CallCollect } from './CallCollect'
import { decoratePromise } from '../decoratePromise'

export interface CallCollectEnded {
  id: string
  callId: string
  nodeId: string
  controlId: string
  result?: CallingCallCollectResult
  type?: CallingCallCollectResult['type']
  reason?: CallingCallCollectResult['type']
  digits?: string
  speech?: string
  terminator?: string
  text?: string
  confidence?: number
}

export interface CallCollectPromise extends Promise<CallCollectEnded> {
  onStarted: () => Promise<CallCollect>
  onEnded: () => Promise<CallCollectEnded>
  stop: () => Promise<CallCollect>
  startInputTimers: () => Promise<CallCollect>
  id: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  result?: Promise<CallingCallCollectResult>
  type?: Promise<CallingCallCollectResult['type']>
  reason?: Promise<CallingCallCollectResult['type']>
  digits?: Promise<string>
  speech?: Promise<string>
  terminator?: Promise<string>
  text?: Promise<string>
  confidence?: Promise<number>
}

export const getters = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'result',
  'type',
  'reason',
  'digits',
  'speech',
  'terminator',
  'text',
  'confidence',
]

export const methods = ['stop', 'startInputTimers']

export function decorateCollectPromise(
  this: Call,
  innerPromise: Promise<CallCollect>
) {
  // prettier-ignore
  return (decoratePromise<CallCollect, CallCollectEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'collect',
    methods,
    getters,
  }) as CallCollectPromise
}
