import { CallingCallPlayEndState, CallingCallPlayState } from '@signalwire/core'
import { Call } from '../Call'
import { CallPlayback, PLAYBACK_ENDED_STATES } from './CallPlayback'

export interface CallPlaybackEnded {
  id: string
  volume: number
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallPlayEndState
}

export interface CallPlaybackPromise extends Promise<CallPlaybackEnded> {
  onStarted: () => Promise<CallPlayback>
  onEnded: () => Promise<CallPlaybackEnded>
  pause: () => Promise<CallPlayback>
  resume: () => Promise<CallPlayback>
  stop: () => Promise<CallPlayback>
  setVolume: () => Promise<CallPlayback>
  id: Promise<string>
  volume: Promise<number>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  state: Promise<CallingCallPlayState>
}

const getters = ['id', 'volume', 'callId', 'nodeId', 'controlId', 'state']

const methods = ['pause', 'resume', 'stop', 'setVolume']

export function decoratePlaybackPromise(
  this: Call,
  innerPromise: Promise<CallPlayback>
) {
  const promise = new Promise<CallPlayback>((resolve, reject) => {
    const endedHandler = (callPlayback: CallPlayback) => {
      this.off('playback.ended', endedHandler)
      resolve(callPlayback)
    }

    this.once('playback.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('playback.ended', endedHandler)
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
        if (PLAYBACK_ENDED_STATES.includes(this.state)) {
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

  return promise as unknown as CallPlaybackPromise
}
