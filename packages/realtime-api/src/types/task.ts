// FIXME: move 'task.inbound' in core?
export type RealTimeTaskApiEventsHandlerMapping = Record<
  'task.inbound',
  (params: Record<string, unknown>) => void
>

export type RealTimeTaskApiEvents = {
  [k in keyof RealTimeTaskApiEventsHandlerMapping]: RealTimeTaskApiEventsHandlerMapping[k]
}
