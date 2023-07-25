import {
  BaseComponentOptions,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  SessionEvents,
} from '..'
import { BasePubSubConsumer } from '../pubSub'
import type {
  ChatEventNames,
  ChatMemberEventNames,
  ChatMessageEventName,
  ChatMethods,
} from '../types/chat'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'
import { ChatMember } from './ChatMember'
import { ChatMessage } from './ChatMessage'
import * as chatMethods from './methods'
import { chatWorker } from './workers/chatWorker'

export type BaseChatApiEventsHandlerMapping = Record<
  ChatMessageEventName,
  (message: ChatMessage) => void
> &
  Record<ChatMemberEventNames, (member: ChatMember) => void> &
  Record<Extract<SessionEvents, 'session.expiring'>, () => void>

/**
 * @privateRemarks
 *
 * Each package will have the option to either extend this
 * type or provide their own event mapping.
 */
export type BaseChatApiEvents<T = BaseChatApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

export class BaseChatConsumer extends BasePubSubConsumer<BaseChatApiEvents> {
  protected override subscribeMethod: JSONRPCSubscribeMethod = `${PRODUCT_PREFIX_CHAT}.subscribe`

  constructor(options: BaseComponentOptions<BaseChatApiEvents>) {
    super(options)
  }

  protected override initWorker() {
    this.runWorker('chat', { worker: chatWorker })
  }
}

export const BaseChatAPI = extendComponent<BaseChatConsumer, ChatMethods>(
  BaseChatConsumer,
  {
    publish: chatMethods.publish,
    getMembers: chatMethods.getMembers,
    getMessages: chatMethods.getMessages,
    setMemberState: chatMethods.setMemberState,
    getMemberState: chatMethods.getMemberState,
  }
)

export const createBaseChatObject = <ChatType>(
  params: BaseComponentOptions<ChatEventNames>
) => {
  const chat = connect<BaseChatApiEvents, BaseChatConsumer, ChatType>({
    store: params.store,
    Component: BaseChatAPI,
  })(params)

  return chat
}
