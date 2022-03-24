import type { TaskInboundEventName } from '@signalwire/core'

export type RealTimeTaskApiEventsHandlerMapping = Record<
  TaskInboundEventName,
  (params: Record<string, unknown>) => void
>

export type RealTimeTaskApiEvents = {
  [k in keyof RealTimeTaskApiEventsHandlerMapping]: RealTimeTaskApiEventsHandlerMapping[k]
}
