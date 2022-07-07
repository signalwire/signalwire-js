import { Chat } from '@signalwire/core'
import ChatMember = Chat.ChatMember
import ChatMessage = Chat.ChatMessage

export * from './Client'

export type PagingCursor =
  | {
      before: string
      after?: never
    }
  | {
      before?: never
      after: string
    }

export {
  ChatMember,
  ChatMessage,
}
