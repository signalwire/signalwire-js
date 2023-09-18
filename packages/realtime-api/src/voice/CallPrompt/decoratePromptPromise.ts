import { CallingCallCollectResult } from '@signalwire/core'
import { Call } from '../Call'
import { CallPrompt } from './CallPrompt'
import { decoratePromise } from '../decoratePromise'

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

export interface CallPromptPromise extends Promise<CallPromptEnded> {
  onStarted: () => Promise<CallPrompt>
  onEnded: () => Promise<CallPromptEnded>
  stop: () => Promise<CallPrompt>
  setVolume: () => Promise<CallPrompt>
  id: Promise<string>
  controlId: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  result: Promise<CallingCallCollectResult>
  type: Promise<CallingCallCollectResult['type']>
  reason: Promise<CallingCallCollectResult['type']>
  digits?: Promise<string>
  speech?: Promise<string>
  terminator?: Promise<string>
  text?: Promise<string>
  confidence?: Promise<number>
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

export const methods = ['stop', 'setVolume']

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
