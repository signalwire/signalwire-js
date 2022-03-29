// import type { CallCreated, CallEnded } from '@signalwire/core'
import type { Call } from '../voice/Call'

// Record<
//   CallCreated | CallEnded,
//   (call: Call) => void
// >

// TODO: replace `any` with proper types.
export type RealTimeCallApiEventsHandlerMapping = Record<
  'call.received',
  (call: Call) => void
>

export type RealTimeCallApiEvents = {
  [k in keyof RealTimeCallApiEventsHandlerMapping]: RealTimeCallApiEventsHandlerMapping[k]
}
