import type { OnlyStateProperties, OnlyFunctionProperties } from '.'

export interface ChatContract {}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = OnlyFunctionProperties<ChatContract>
