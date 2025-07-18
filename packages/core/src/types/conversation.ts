import { SwEvent } from '..'

export type ConversationMessageEventName = 'conversation.message'

export interface ConversationMessageEventParams {
  group_id: string
  details: Record<string, unknown>
  hidden: boolean
  id: string
  kind?: string
  metadata: Record<string, unknown>
  subtype: string
  text?: string
  ts: number
  type: string
  from_address_id: string
}

export type ConversationChatMessageEventParams = Omit<
  ConversationMessageEventParams,
  'kind' | 'hidden' | 'metadata'
> & {
  text: string
  user_name: string
}

export interface ConversationMessageEvent extends SwEvent {
  event_type: ConversationMessageEventName
  params: ConversationMessageEventParams
}

export interface ConversationChatMessageEvent extends SwEvent {
  event_type: ConversationMessageEventName
  params: ConversationChatMessageEventParams
}

export type ConversationEvent = ConversationMessageEvent

export type ConversationEventParams = ConversationMessageEventParams
export type ConversationChatEventParams = ConversationChatMessageEventParams
