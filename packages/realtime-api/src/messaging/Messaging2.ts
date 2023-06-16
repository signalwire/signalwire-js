import {
  MessagingEventNames,
  toExternalJSON,
  EventEmitter,
} from '@signalwire/core'
import { BaseNamespace, ListenOptions } from '../BaseNamespace'
import { SWClient } from '../SWClient'
import { Message } from './Message'
import { messagingWorker } from './workers'

interface MessageListenOptions extends ListenOptions {
  onMessageReceived?: (payload: Message) => unknown
  onMessageUpdated?: (payload: Message) => unknown
}

type MessageListenerKeys = keyof Omit<MessageListenOptions, 'topics'>

interface MessagingSendParams {
  context?: string
  from: string
  to: string
  body?: string
  tags?: string[]
  region?: string
  media?: string[]
}

interface InternalMessagingSendParams
  extends Omit<MessagingSendParams, 'from' | 'to'> {
  from_number: string
  to_number: string
}

export interface MessagingSendResult {
  message: string
  code: string
  messageId: string
}

interface MessagingSendError {
  message: string
  code: string
  errors: Record<any, any>
}

export class Messaging extends BaseNamespace<MessageListenOptions> {
  protected _messagingEmitter = new EventEmitter()
  protected _eventMap: Record<MessageListenerKeys, MessagingEventNames> = {
    onMessageReceived: 'message.received',
    onMessageUpdated: 'message.updated',
  }

  constructor(options: SWClient) {
    super({ swClient: options })

    this._client.runWorker('messagingWorker', {
      worker: messagingWorker,
      initialState: {
        messagingEmitter: this._messagingEmitter,
      },
    })
  }

  get emitter() {
    return this._messagingEmitter
  }

  async send(params: MessagingSendParams): Promise<any> {
    const { from = '', to = '', ...rest } = params
    const sendParams: InternalMessagingSendParams = {
      ...rest,
      from_number: from,
      to_number: to,
    }

    try {
      const response: any = await this._client.execute({
        method: 'messaging.send',
        params: sendParams,
      })

      return toExternalJSON<MessagingSendResult>(response)
    } catch (error) {
      this._client.logger.error('Error sending message', error)
      throw error as MessagingSendError
    }
  }
}
