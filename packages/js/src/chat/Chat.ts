import {
  AssertSameType,
  BaseComponentOptions,
  BaseConsumer,
  ChatMethods,
  connect,
  ConsumerContract,
  extendComponent,
  ChatContract,
  SagaIterator,
  sagaEffects,
  Chat,
} from '@signalwire/core'
import { ChatApiEvents } from '../types'

// TODO
type EmitterTransformsEvents = ''

interface ChatMain
  extends ChatContract,
    ConsumerContract<ChatApiEvents, ChatFullState> {}

interface ChatDocs extends ChatMain {}

export interface Chat extends AssertSameType<ChatMain, ChatDocs> {}

export interface ChatFullState extends Chat {}

// TODO: find a better place to put this.
export function* chatWorker(): SagaIterator {
  while (true) {
    const action = yield sagaEffects.take((action: any) =>
      action.type.startsWith('chat.')
    )
    console.debug('chatWorker:', action)
  }
}

class ChatConsumer extends BaseConsumer<ChatApiEvents> {
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

export const ChatAPI = extendComponent<ChatConsumer, ChatMethods>(
  ChatConsumer,
  {
    publish: Chat.publish,
  }
)

export const createChatObject = (
  params: BaseComponentOptions<EmitterTransformsEvents>
): Chat => {
  const chat = connect<ChatApiEvents, ChatConsumer, Chat>({
    store: params.store,
    Component: ChatAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return chat
}
