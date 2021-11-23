import { OnlyStateProperties, OnlyFunctionProperties } from '..'

export type ChatApiEventsHandlerMapping = Record<
  'message',
  (message: any) => void
>

export type ChatApiEvents = {
  [k in keyof ChatApiEventsHandlerMapping]: ChatApiEventsHandlerMapping[k]
}

export interface ChatPublishParams {
  message: any
  channel: string
  meta?: any
}
export interface ChatContract {
  subscribe(channels: string[]): any
  publish(params: ChatPublishParams): any
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe'
>
