import type { CallCreated, CallEnded } from '@signalwire/core'

// TODO: replace `any` with proper types.
export type RealTimeCallApiEventsHandlerMapping = Record<
  CallCreated | CallEnded,
  (params: any) => void
>

export type RealTimeCallApiEvents = {
  [k in keyof RealTimeCallApiEventsHandlerMapping]: RealTimeCallApiEventsHandlerMapping[k]
}
