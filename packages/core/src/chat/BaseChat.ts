import {
  BaseComponentOptions,
  BaseConsumer,
  ChatApiEvents,
  ChatMethods,
  connect,
  extendComponent,
  toExternalJSON,
} from '..'
import * as chatMethods from './methods'
import * as workers from './workers'

// TODO
type EmitterTransformsEvents = ''

export class BaseChatConsumer extends BaseConsumer<ChatApiEvents> {
  protected _eventsPrefix = 'chat' as const

  protected getWorkers() {
    return new Map([['chat', { worker: workers.chatWorker }]])
  }

  private _setSubscribeParams(channels?: string[]) {
    this.subscribeParams = {
      ...this.subscribeParams,
      channels,
    }
  }

  async subscribe(channels?: string[]) {
    if (!channels || channels.length === 0) {
      throw new Error(
        'Please specify one or more channels when calling .subscribe()'
      )
    }

    this._setSubscribeParams(channels)

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
            console.log('--> payload', toExternalJSON(p))
            return toExternalJSON(p)
          },
        },
      ],
    ])
  }

  onChatSubscribed() {
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
      id: 'onChatSubscribed',
    },
  })(params)

  return chat
}
