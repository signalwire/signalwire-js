import { CallingCallCollectResult } from '@signalwire/core'
import { Call } from '../Call'
import { CallCollect, COLLECT_ENDED_STATES } from './CallCollect'

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
  const promise = new Promise<CallCollect>((resolve, reject) => {
    const endedHandler = (callCollect: CallCollect) => {
      this.off('collect.ended', endedHandler)
      resolve(callCollect)
    }

    this.once('collect.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('collect.ended', endedHandler)
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
        if (COLLECT_ENDED_STATES.includes(this.state)) {
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

  return promise as unknown as CallCollectPromise
}
