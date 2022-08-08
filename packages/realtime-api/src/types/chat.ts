import type {
  ChatMember,
  ChatMemberEventNames,
  ChatMessage,
  ChatMessageEventName,
} from '@signalwire/core'

export type RealTimeChatApiEventsHandlerMapping = Record<
  ChatMessageEventName,
  (message: ChatMessage) => void
> &
  Record<ChatMemberEventNames, (member: ChatMember) => void>
