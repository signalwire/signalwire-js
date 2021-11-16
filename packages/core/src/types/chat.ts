import type { OnlyStateProperties, OnlyFunctionProperties } from '.'

export interface ChatContract {
  publish(options: any): any
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = OnlyFunctionProperties<ChatContract>
