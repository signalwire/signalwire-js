import {
  BaseComponentOptions,
  BaseConsumer,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  toExternalJSON,
  InternalChatChannel,
  EventTransform,
} from '..'
import { ChatMessage } from './ChatMessage'
import * as chatMethods from './methods'
import * as workers from './workers'
import type {
  ChatChannelMessageEvent,
  ChatMethods,
  ChatMessageEventName,
  ChatEventNames,
} from '../types/chat'

export type BaseChatApiEventsHandlerMapping = Record<
  ChatMessageEventName,
  (message: ChatMessage) => void
>

/**
 * @privateRemarks
 *
 * Each package will have the option to either extend this
 * type or provide their own event mapping.
 */
export type BaseChatApiEvents<T = BaseChatApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

const toInternalChatChannels = (channels: string[]): InternalChatChannel[] => {
  return channels.map((name) => {
    return {
      name,
    }
  })
}

export class BaseChatConsumer extends BaseConsumer<BaseChatApiEvents> {
  protected override _eventsPrefix = 'chat' as const
  protected override subscribeMethod: JSONRPCSubscribeMethod = 'chat.subscribe'

  protected getWorkers() {
    return new Map([['chat', { worker: workers.chatWorker }]])
  }

  private _setSubscribeParams(channels: string[]) {
    this.subscribeParams = {
      ...this.subscribeParams,
      channels: toInternalChatChannels(channels),
    }
  }

  async subscribe(channels?: string | string[]) {
    const _channels =
      !channels || Array.isArray(channels) ? channels : [channels]

    if (!Array.isArray(_channels) || _channels.length === 0) {
      throw new Error(
        'Please specify one or more channels when calling .subscribe()'
      )
    }

    this._setSubscribeParams(_channels)

    return await super.subscribe()
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<ChatEventNames | ChatEventNames[], EventTransform>([
      [
        ['message'],
        {
          type: 'chatMessage',
          instanceFactory: (payload: ChatChannelMessageEvent) => {
            return new ChatMessage(toExternalJSON(payload.params))
          },
          payloadTransform: (payload: ChatChannelMessageEvent) => {
            return toExternalJSON(payload.params)
          },
        },
      ],
    ])
  }

  onChatInitialized() {
    this._attachListeners('')
  }
}

export const BaseChatAPI = extendComponent<BaseChatConsumer, ChatMethods>(
  BaseChatConsumer,
  {
    publish: chatMethods.publish,
  }
)

export const createBaseChatObject = <ChatType>(
  params: BaseComponentOptions<ChatEventNames>
) => {
  const chat = connect<BaseChatApiEvents, BaseChatConsumer, ChatType>({
    store: params.store,
    Component: BaseChatAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
      id: 'onChatInitialized',
    },
  })(params)

  return chat
}
