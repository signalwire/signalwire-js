import { CallingCallCollectResult, Promisify } from '@signalwire/core'
import { Call } from '../Call'
import { CallPrompt } from './CallPrompt'
import { decoratePromise } from '../../decoratePromise'
import { CallPromptListeners } from '../../types'

export interface CallPromptEnded {
  id: string
  controlId: string
  callId: string
  nodeId: string
  result: CallingCallCollectResult
  type: CallingCallCollectResult['type']
  reason: CallingCallCollectResult['type']
  digits?: string
  speech?: string
  terminator?: string
  text?: string
  confidence?: number
}

export interface CallPromptPromise
  extends Promise<CallPromptEnded>,
    Promisify<CallPromptEnded> {
  onStarted: () => Promise<CallPrompt>
  onEnded: () => Promise<CallPromptEnded>
  listen: (listeners: CallPromptListeners) => Promise<() => Promise<void>>
  stop: () => Promise<CallPrompt>
  setVolume: () => Promise<CallPrompt>
  ended: () => Promise<CallPrompt>
}

export const getters = [
  'id',
  'controlId',
  'callId',
  'nodeId',
  'result',
  'type',
  'reason',
  'digits',
  'speech',
  'terminator',
  'text',
  'confidence',
]

export const methods = ['stop', 'setVolume', 'ended']

export function decoratePromptPromise(
  this: Call,
  innerPromise: Promise<CallPrompt>
) {
  // prettier-ignore
  return (decoratePromise<CallPrompt, CallPromptEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'prompt',
    methods,
    getters,
  }) as CallPromptPromise
}
