import {
  BaseComponentOptions,
  BaseConsumer,
  ChatMethods,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  toExternalJSON,
  InternalChatChannel,
  EventTransform,
  ChatChannelMessageEvent,
  EventEmitter,
} from '..'
import { BaseChatMessage } from './BaseChatMessage'
import * as chatMethods from './methods'
import * as workers from './workers'

export type BaseChatApiEventsHandlerMapping = Record<
  'message',
  (message: any) => void
>

export type BaseChatApiEvents = {
  [k in keyof BaseChatApiEventsHandlerMapping]: BaseChatApiEventsHandlerMapping[k]
}

// TODO:
type ChatTransformsEvents = 'message'

const toInternalChatChannels = (channels: string[]): InternalChatChannel[] => {
  return channels.map((name) => {
    return {
      name,
    }
  })
}

export class BaseChatConsumer<
  T extends EventEmitter.ValidEventTypes = BaseChatApiEvents
> extends BaseConsumer<T> {
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
    return new Map<
      ChatTransformsEvents | ChatTransformsEvents[],
      EventTransform
    >([
      [
        ['message'],
        {
          type: 'chatMessage',
          instanceFactory: (payload: ChatChannelMessageEvent) => {
            return new BaseChatMessage(toExternalJSON(payload.params))
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

export const BaseChatAPI = <
  ChatApiEvents extends EventEmitter.ValidEventTypes = BaseChatApiEvents
>() =>
  extendComponent<BaseChatConsumer<ChatApiEvents>, ChatMethods>(
    BaseChatConsumer,
    {
      publish: chatMethods.publish,
    }
  )

export const createBaseChatObject = <
  ChatType,
  ChatApiEvents extends EventEmitter.ValidEventTypes = BaseChatApiEvents
>(
  params: BaseComponentOptions<ChatTransformsEvents>
) => {
  const chat = connect<
    ChatApiEvents,
    BaseChatConsumer<ChatApiEvents>,
    ChatType
  >({
    store: params.store,
    Component: BaseChatAPI<ChatApiEvents>(),
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
      id: 'onChatInitialized',
    },
  })(params)

  return chat
}
