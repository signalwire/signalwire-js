import {
  EventEmitter,
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
  private _pubSubEmitter = new EventEmitter()
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
        pubSubEmitter: this._pubSubEmitter,
      },
    })
  }

  protected get emitter() {
    return this._pubSubEmitter
  }
}

export type { PubSubMessageContract } from '@signalwire/core'
