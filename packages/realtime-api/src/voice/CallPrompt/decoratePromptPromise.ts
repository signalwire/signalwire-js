import { CallingCallCollectResult } from '@signalwire/core'
import { Call } from '../Call'
import { CallPrompt, PROMPT_ENDED_STATES } from './CallPrompt'

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
  const promise = new Promise<CallPrompt>((resolve, reject) => {
    const endedHandler = (callPrompt: CallPrompt) => {
      this.off('prompt.ended', endedHandler)
      resolve(callPrompt)
    }

    this.once('prompt.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('prompt.ended', endedHandler)
      reject(error)
    })
  })

  Object.defineProperties(promise, {
    onStarted: {
      value: async function () {
        return await innerPromise
      },
      enumerable: true,
    },
    onEnded: {
      value: async function () {
        if (PROMPT_ENDED_STATES.includes(this.state)) {
          return this
        }
        return await promise
      },
      enumerable: true,
    },
    ...methods.reduce((acc: any, method) => {
      acc[method] = {
        value: async function () {
          const playback = await this.onStarted()
          return playback[method]()
        },
        enumerable: true,
      }
      return acc
    }, {}),
    ...getters.reduce((acc: any, gettter) => {
      acc[gettter] = {
        get: async function () {
          const playback = await this.onStarted()
          return playback[gettter]
        },
        enumerable: true,
      }
      return acc
    }, {}),
  })

  return promise as unknown as CallPromptPromise
}
