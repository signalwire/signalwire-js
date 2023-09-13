import {
  CallingCallRecordEndState,
  CallingCallPlayState,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallRecording, RECORDING_ENDED_STATES } from './CallRecording'

export interface CallRecordingEnded {
  id: string
  volume: number
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallRecordEndState
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

const getters = [
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

const methods = ['stop']

export function decorateRecordingPromise(
  this: Call,
  innerPromise: Promise<CallRecording>
) {
  const promise = new Promise<CallRecording>((resolve, reject) => {
    const endedHandler = (callRecording: CallRecording) => {
      this.off('recording.ended', endedHandler)
      resolve(callRecording)
    }

    this.once('recording.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('recording.ended', endedHandler)
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
        if (RECORDING_ENDED_STATES.includes(this.state)) {
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

  return promise as unknown as CallRecordingPromise
}
