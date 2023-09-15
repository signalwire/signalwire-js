import { CallingCallTapEndState, CallingCallTapState } from '@signalwire/core'
import { Call } from '../Call'
import { CallTap, TAP_ENDED_STATES } from './CallTap'

export interface CallTapEnded {
  id: string
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallTapEndState
}

export interface CallTapPromise extends Promise<CallTapEnded> {
  onStarted: () => Promise<CallTap>
  onEnded: () => Promise<CallTapEnded>
  stop: () => Promise<CallTap>
  id: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  state: Promise<CallingCallTapState>
}

export const getters = ['id', 'callId', 'nodeId', 'controlId', 'state']

export const methods = ['stop']

export function decorateTapPromise(this: Call, innerPromise: Promise<CallTap>) {
  const promise = new Promise<CallTap>((resolve, reject) => {
    const endedHandler = (callTap: CallTap) => {
      this.off('tap.ended', endedHandler)
      resolve(callTap)
    }

    this.once('tap.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('tap.ended', endedHandler)
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
        if (TAP_ENDED_STATES.includes(this.state)) {
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

  return promise as unknown as CallTapPromise
}
