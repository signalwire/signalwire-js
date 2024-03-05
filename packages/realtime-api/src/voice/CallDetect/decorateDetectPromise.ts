import {
  CallingCallDetectType,
  Detector,
  DetectorResult,
  Promisify,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallDetect } from './CallDetect'
import { decoratePromise } from '../../decoratePromise'
import { CallDetectListeners } from '../../types'

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

export interface CallDetectPromise
  extends Promise<CallDetectEnded>,
    Promisify<CallDetectEnded> {
  onStarted: () => Promise<CallDetect>
  onEnded: () => Promise<CallDetectEnded>
  listen: (listeners: CallDetectListeners) => Promise<() => Promise<void>>
  stop: () => Promise<CallDetect>
  ended: () => Promise<CallDetect>
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

export const methods = ['stop', 'ended']

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
