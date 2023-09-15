import {
  CallingCallDetectType,
  Detector,
  DetectorResult,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallDetect, DETECT_ENDED_STATES } from './CallDetect'

export interface CallDetectEnded {
  id: string
  callId: string
  nodeId: string
  controlId: string
  detect?: Detector
  type?: CallingCallDetectType
  result: DetectorResult
  waitForBeep: boolean
  beep?: boolean
}

export interface CallDetectPromise extends Promise<CallDetectEnded> {
  onStarted: () => Promise<CallDetect>
  onEnded: () => Promise<CallDetectEnded>
  stop: () => Promise<CallDetect>
  id: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
  detect?: Promise<Detector>
  type?: Promise<CallingCallDetectType>
  result: Promise<DetectorResult>
  waitForBeep: Promise<boolean>
  beep?: Promise<boolean>
}

export const getters = [
  'id',
  'callId',
  'nodeId',
  'controlId',
  'detect',
  'type',
  'result',
  'waitForBeep',
  'beep',
]

export const methods = ['stop']

export function decorateDetectPromise(
  this: Call,
  innerPromise: Promise<CallDetect>
) {
  const promise = new Promise<CallDetect>((resolve, reject) => {
    const endedHandler = (callDetect: CallDetect) => {
      this.off('detect.ended', endedHandler)
      resolve(callDetect)
    }

    this.once('detect.ended', endedHandler)

    innerPromise.catch((error) => {
      this.off('detect.ended', endedHandler)
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
        if (DETECT_ENDED_STATES.includes(this.state)) {
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

  return promise as unknown as CallDetectPromise
}
