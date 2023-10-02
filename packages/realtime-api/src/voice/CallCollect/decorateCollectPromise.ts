import { CallingCallCollectResult, Promisify } from '@signalwire/core'
import { Call } from '../Call'
import { CallCollect } from './CallCollect'
import { decoratePromise } from '../../decoratePromise'
import { CallCollectListeners } from '../../types'

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
export interface CallCollectPromise
  extends Promise<CallCollectEnded>,
    Promisify<CallCollectEnded> {
  onStarted: () => Promise<CallCollect>
  onEnded: () => Promise<CallCollectEnded>
  listen: (listeners: CallCollectListeners) => Promise<() => Promise<void>>
  stop: () => Promise<CallCollect>
  startInputTimers: () => Promise<CallCollect>
  ended: () => Promise<CallCollect>
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

export const methods = ['stop', 'startInputTimers', 'ended']

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
