import {
  BaseComponentOptions,
  BaseConsumer,
  Chat as ChatCore,
  ChatMethods,
  connect,
  extendComponent,
  sagaEffects,
  SagaIterator,
} from '@signalwire/core'
import type { ChatApiEvents } from '../types'

// TODO
type EmitterTransformsEvents = ''

// TODO: find a better place to put this.
export function* chatWorker(): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) =>
      action.type.startsWith('chat.')
    )
    console.debug('chatWorker:', action)
  }
}

class BaseChatConsumer extends BaseConsumer<ChatApiEvents> {
  protected _eventsPrefix = 'chat' as const

  protected getWorkers() {
    return new Map([['chat', { worker: chatWorker }]])
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
}

export const BaseChatAPI = extendComponent<BaseChatConsumer, ChatMethods>(
  BaseChatConsumer,
  {
    publish: ChatCore.publish,
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
    },
  })(params)

  return chat
}
