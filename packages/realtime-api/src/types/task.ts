import type { TaskReceivedEventName } from '@signalwire/core'

export type RealTimeTaskApiEventsHandlerMapping = Record<
  TaskReceivedEventName,
  (params: Record<string, unknown>) => void
>

export type RealTimeTaskApiEvents = {
  [k in keyof RealTimeTaskApiEventsHandlerMapping]: RealTimeTaskApiEventsHandlerMapping[k]
}
