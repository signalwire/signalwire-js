import {
  PubSubMessageEventName,
  PubSubNamespace,
  PubSubMessage,
} from '@signalwire/core'
import { SWClient } from '../SWClient'
import { pubSubWorker } from './workers'
import { BaseChat, BaseChatListenOptions } from '../chat/BaseChat'

interface PubSubListenOptions extends BaseChatListenOptions {
  onMessageReceived?: (message: PubSubMessage) => unknown
}

type PubSubListenersKeys = keyof Omit<PubSubListenOptions, 'channels'>

export class PubSub extends BaseChat<PubSubListenOptions> {
  protected _eventMap: Record<
    PubSubListenersKeys,
    `${PubSubNamespace}.${PubSubMessageEventName}`
  > = {
    onMessageReceived: 'chat.message',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('pubSubWorker', {
      worker: pubSubWorker,
      initialState: {
        pubSubEmitter: this,
      },
    })
  }
}

export type { PubSubMessageContract } from '@signalwire/core'
