import { MessageDirection, MessageState, RequireAtLeastOne } from "@signalwire/core"

export type BaseMessageMethodParams = {
  context: string,
  region?: string,
  body?: string,
  tags?: string[],
  media?: string[],
  to: string,
  from: string,
  onMessageStateChange?: (messageObj: MessageObject) => void
}

export type MessageMethodParams = RequireAtLeastOne<BaseMessageMethodParams & {
  type: 'sms' | 'mms',
}, 'body' | 'media'>

export type SMSMessageMethodParams = 
  Required<Pick<BaseMessageMethodParams, 'body'>>
  & Omit<BaseMessageMethodParams, 'body'>

export type MMSMessageMethodParams = 
  Required<Pick<BaseMessageMethodParams, 'media'>>
  & Omit<BaseMessageMethodParams, 'media'>

export type MessageMethodResponse = {
  message_id: string,
  code: string,
  message: string
}

export type MessageAPIEventHandlerMapping = Record<'receive', (...args: any[]) => void>

export type MessageObject = {
  id: string,
  from: string,
  to: string,
  tags?: string[],
  direction: MessageDirection,
  media?: string[],
  body?: string,
  state: MessageState,
  delivered: boolean,
  sent: boolean,
  context: string,
}
