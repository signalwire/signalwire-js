import type {
  ChatMember,
  ChatMemberEventNames,
  ChatMessage,
  ChatMessageEventName,
  ChatNamespace,
} from '@signalwire/core'

export type RealTimeChatApiEventsHandlerMapping = Record<
  `${ChatNamespace}.${ChatMessageEventName}`,
  (message: ChatMessage) => void
> &
  Record<
    `${ChatNamespace}.${ChatMemberEventNames}`,
    (member: ChatMember) => void
  >

export type RealTimeChatEvents = {
  [k in keyof RealTimeChatApiEventsHandlerMapping]: RealTimeChatApiEventsHandlerMapping[k]
}
