import { MessageDirection, MessageState } from "@signalwire/core"


export type MessageMethodParams = {
  type: 'sms' | 'mms',
  context: string,
  region?: string,
  body?: string,
  tags?: string[],
  media?: string[],
  to: string,
  from: string,
  onMessageStateChange?: (messageObj: MessageObject) => void
}

export type MessageMethodResponse = {
  message_id: string,
  code: string,
  message: string
}

export type MessageMethodParamsWithoutType = Omit<MessageMethodParams, 'type'>

export type MessageAPIEventHandlerMapping = Record<'state' | 'receive', (...args: any[]) => void>

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
  sent: boolean
}
