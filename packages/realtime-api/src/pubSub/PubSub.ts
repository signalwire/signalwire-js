import {
  PubSubMessageEventName,
  PubSubNamespace,
  PubSubMessage,
} from '@signalwire/core'
import { SWClient } from '../SWClient'
import { pubSubWorker } from './workers'
import { BaseChat } from '../chat/BaseChat'
import { RealTimePubSubEvents } from '../types/pubSub'

interface PubSubListenOptions {
  channels: string[]
  onMessageReceived?: (message: PubSubMessage) => unknown
}

type PubSubListenersKeys = keyof Omit<
  PubSubListenOptions,
  'channels' | 'topics'
>

export class PubSub extends BaseChat<
  PubSubListenOptions,
  RealTimePubSubEvents
> {
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
        pubSub: this,
      },
    })
  }
}

export type { PubSubMessageContract } from '@signalwire/core'
