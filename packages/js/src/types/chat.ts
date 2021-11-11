export type ChatApiEventsHandlerMapping = Record<
  'message',
  (message: any) => void
>

export type ChatApiEvents = {
  [k in keyof ChatApiEventsHandlerMapping]: ChatApiEventsHandlerMapping[k]
}
