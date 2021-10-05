import { INTERNAL_GLOBAL_MESSAGING_EVENTS } from '../utils/constants'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageState = 'queued' | 'initiated' | 'sent' | 'delivered' | 'undelivered' | 'failed'
export type MessageEventTypes = typeof INTERNAL_GLOBAL_MESSAGING_EVENTS[number]

export interface MessagePubsubEvent {
  type: MessageEventTypes,
  payload: MessageEventParams['params']
}

export type MessageEventParams = {
  event_type: MessageEventTypes,
  context: string,
  timestamp: number,
  space_id: string,
  project_id: string,
  params: {
    message_id: string,
    context: string,
    direction: MessageDirection,
    tags?: string[],
    from_number: string,
    to_number: string,
    body: string,
    media: string[],
    segments: number,
    message_state: MessageState,
    reason?: string
  }
}