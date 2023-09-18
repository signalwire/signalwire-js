import { CallingCallTapEndState, CallingCallTapState } from '@signalwire/core'
import { Call } from '../Call'
import { CallTap } from './CallTap'
import { decoratePromise } from '../decoratePromise'
import { CallTapListeners } from '../../types'

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
  listen: (listeners: CallTapListeners) => Promise<() => Promise<void>>
  stop: () => Promise<CallTap>
  ended: () => Promise<CallTap>
  id: Promise<string>
  callId: Promise<string>
  nodeId: Promise<string>
  controlId: Promise<string>
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
