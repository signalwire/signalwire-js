import {
  CallingCallDetectType,
  Detector,
  DetectorResult,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallDetect } from './CallDetect'
import { decoratePromise } from '../decoratePromise'

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
  // prettier-ignore
  return (decoratePromise<CallDetect, CallDetectEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'detect',
    methods,
    getters,
  }) as CallDetectPromise
}
