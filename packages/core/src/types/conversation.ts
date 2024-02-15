import { SwEvent } from '..'

export type ConversationMessageEventName = 'conversation.message'

export interface ConversationMessageEventParams {
  conversation_id: string
  conversation_name: string
  details: Record<string, unknown>
  hidden: boolean
  id: string
  kind: string
  metadata: Record<string, unknown>
  subtype: string
  text?: string
  ts: number
  type: string
  user_id: string
  user_name: string
}

export interface ConversationMessageEvent extends SwEvent {
  event_type: ConversationMessageEventName
  params: ConversationMessageEventParams
}

export type ConversationEvent = ConversationMessageEvent

export type ConversationEventParams = ConversationMessageEventParams
