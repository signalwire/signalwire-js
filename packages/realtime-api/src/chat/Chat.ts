import {
  ChatMember,
  ChatMessage,
  ChatEvents,
  Chat as ChatCore,
} from '@signalwire/core'
import { BaseChat, BaseChatListenOptions } from './BaseChat'
import { chatWorker } from './workers'
import { SWClient } from '../SWClient'

interface ChatListenOptions extends BaseChatListenOptions {
  onMessageReceived?: (message: ChatMessage) => unknown
  onMemberJoined?: (member: ChatMember) => unknown
  onMemberUpdated?: (member: ChatMember) => unknown
  onMemberLeft?: (member: ChatMember) => unknown
}

type ChatListenersKeys = keyof Omit<ChatListenOptions, 'channels'>

export class Chat extends ChatCore.applyCommonMethods(
  BaseChat<ChatListenOptions>
) {
  protected _eventMap: Record<ChatListenersKeys, ChatEvents> = {
    onMessageReceived: 'chat.message',
    onMemberJoined: 'chat.member.joined',
    onMemberUpdated: 'chat.member.updated',
    onMemberLeft: 'chat.member.left',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('chatWorker', {
      worker: chatWorker,
      initialState: {
        chatEmitter: this,
      },
    })
  }
}

export { ChatMember, ChatMessage } from '@signalwire/core'
export type {
  ChatAction,
  ChatChannel,
  ChatChannelMessageEvent,
  ChatChannelMessageEventParams,
  ChatChannelState,
  ChatEvent,
  ChatGetMembersParams,
  ChatGetMemberStateParams,
  ChatGetMessagesParams,
  ChatMemberContract,
  ChatMemberEntity,
  ChatMemberJoinedEvent,
  ChatMemberJoinedEventParams,
  ChatMemberLeftEvent,
  ChatMemberLeftEventParams,
  ChatMemberUpdatedEvent,
  ChatMemberUpdatedEventParams,
  ChatMessageContract,
  ChatMessageEntity,
  ChatSetMemberStateParams,
  InternalChatMemberEntity,
  InternalChatMessageEntity,
  InternalPubSubMessageEntity,
  MapToPubSubShape,
  MessagingAction,
  PaginationCursor,
  PubSubAction,
  PubSubChannel,
  PubSubChannelMessageEvent,
  PubSubChannelMessageEventParams,
  PubSubEvent,
  PubSubEventAction,
  PubSubPublishParams,
} from '@signalwire/core'
