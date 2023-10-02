import {
  CallingCallTapEndState,
  CallingCallTapState,
  Promisify,
} from '@signalwire/core'
import { Call } from '../Call'
import { CallTap } from './CallTap'
import { decoratePromise } from '../../decoratePromise'
import { CallTapListeners } from '../../types'

export interface CallTapEnded {
  id: string
  callId: string
  nodeId: string
  controlId: string
  state: CallingCallTapEndState
}

export interface CallTapPromise
  extends Promise<CallTapEnded>,
    Omit<Promisify<CallTapEnded>, 'state'> {
  onStarted: () => Promise<CallTap>
  onEnded: () => Promise<CallTapEnded>
  listen: (listeners: CallTapListeners) => Promise<() => Promise<void>>
  stop: () => Promise<CallTap>
  ended: () => Promise<CallTap>
  state: Promise<CallingCallTapState>
}

export const getters = ['id', 'callId', 'nodeId', 'controlId', 'state']

export const methods = ['stop', 'ended']

export function decorateTapPromise(this: Call, innerPromise: Promise<CallTap>) {
  // prettier-ignore
  return (decoratePromise<CallTap, CallTapEnded>).call(this, { 
    promise: innerPromise,
    namespace: 'tap',
    methods,
    getters,
  }) as CallTapPromise
}
