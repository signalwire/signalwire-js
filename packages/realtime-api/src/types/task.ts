import type { AssertSameType, TaskReceivedEventName } from '@signalwire/core'
import { TaskClientApiEventsDocs } from './task.docs'

export type RealTimeTaskApiEventsHandlerMapping = Record<
  TaskReceivedEventName,
  (params: Record<string, unknown>) => void
>

type TaskClientApiEventsMain = {
  [k in keyof RealTimeTaskApiEventsHandlerMapping]: RealTimeTaskApiEventsHandlerMapping[k]
}

export type TaskClientApiEvents = AssertSameType<
  TaskClientApiEventsMain,
  TaskClientApiEventsDocs
>