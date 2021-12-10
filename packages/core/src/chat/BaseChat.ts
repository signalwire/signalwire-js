import {
  BaseComponentOptions,
  BaseConsumer,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  toExternalJSON,
  InternalChatChannel,
  EventTransform,
  ExecuteParams,
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

  constructor(options: BaseComponentOptions<BaseChatApiEvents>) {
    super(options)

    /**
     * Since we don't need a namespace for these events
     * we'll attach them as soon as the Client has been
     * registered in the Redux store.
     */
    this._attachListeners('')
  }

  private _getChannelsParam(
    channels: string | string[] | undefined,
    method: 'subscribe' | 'unsubscribe'
  ) {
    const _channels =
      !channels || Array.isArray(channels) ? channels : [channels]

    if (!Array.isArray(_channels) || _channels.length === 0) {
      throw new Error(
        `Please specify one or more channels when calling .${method}()`
      )
    }

    return {
      channels: toInternalChatChannels(_channels),
    }
  }

  private _setSubscribeParams(params: Record<string, any>) {
    this.subscribeParams = {
      ...this.subscribeParams,
      ...params,
    }
  }

  protected getWorkers() {
    return new Map([['chat', { worker: workers.chatWorker }]])
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

  async subscribe(channels?: string | string[]) {
    const params = {
      ...this._getChannelsParam(channels, 'subscribe'),
    }

    this._setSubscribeParams(params)

    return await super.subscribe()
  }

  async unsubscribe(channels: string | string[]) {
    const params = {
      ...this._getChannelsParam(channels, 'unsubscribe'),
    }

    return new Promise(async (resolve, reject) => {
      const subscriptions = this.getSubscriptions()
      if (subscriptions.length > 0) {
        const execParams: ExecuteParams = {
          method: 'chat.unsubscribe',
          params: {
            ...params,
            events: subscriptions,
          },
        }

        try {
          await this.execute(execParams)
        } catch (error) {
          return reject(error)
        }
      } else {
        this.logger.warn(
          '`unsubscribe()` was called without any listeners attached.'
        )
      }

      return resolve(undefined)
    })
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
    },
  })(params)

  return chat
}
