import {
  BaseComponentOptions,
  BaseConsumer,
  ChatApiEvents,
  ChatMethods,
  connect,
  extendComponent,
  JSONRPCSubscribeMethod,
  toExternalJSON,
  InternalChatChannel,
} from '..'
import * as chatMethods from './methods'
import * as workers from './workers'

// TODO:
type EmitterTransformsEvents = ''

const toInternalChatChannels = (channels: string[]): InternalChatChannel[] => {
  return channels.map((name) => {
    return {
      name,
    }
  })
}

export class BaseChatConsumer extends BaseConsumer<ChatApiEvents> {
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
    return new Map<any, any>([
      [
        ['message'],
        {
          type: 'chatMessage',
          instanceFactory: () => {
            return {}
          },
          payloadTransform: (p: any) => {
            return toExternalJSON(p)
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
  params: BaseComponentOptions<EmitterTransformsEvents>
) => {
  const chat = connect<ChatApiEvents, BaseChatConsumer, ChatType>({
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
