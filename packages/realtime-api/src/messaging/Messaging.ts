import { MessagingEventNames, toExternalJSON } from '@signalwire/core'
import { BaseNamespace } from '../BaseNamespace'
import { SWClient } from '../SWClient'
import { Message } from './Message'
import { messagingWorker } from './workers'

interface MessageListenOptions {
  topics: string[]
  onMessageReceived?: (message: Message) => unknown
  onMessageUpdated?: (message: Message) => unknown
}

type MessageListenerKeys = keyof Omit<MessageListenOptions, 'topics'>

type MessageEvents = Record<MessagingEventNames, (message: Message) => void>

interface MessageSendMethodParams {
  context?: string
  from: string
  to: string
  body?: string
  tags?: string[]
  region?: string
  media?: string[]
}

interface MessagingSendResult {
  message: string
  code: string
  messageId: string
}

interface MessagingSendError {
  message: string
  code: string
  errors: Record<any, any>
}

export class Messaging extends BaseNamespace<
  MessageListenOptions,
  MessageEvents
> {
  protected _eventMap: Record<MessageListenerKeys, MessagingEventNames> = {
    onMessageReceived: 'message.received',
    onMessageUpdated: 'message.updated',
  }

  constructor(options: SWClient) {
    super(options)

    this._client.runWorker('messagingWorker', {
      worker: messagingWorker,
      initialState: {
        messaging: this,
      },
    })
  }

  async send(params: MessageSendMethodParams): Promise<any> {
    const { from = '', to = '', ...rest } = params
    const sendParams = {
      ...rest,
      from_number: from,
      to_number: to,
    }

    try {
      const response = await this._client.execute<unknown, MessagingSendResult>(
        {
          method: 'messaging.send',
          params: sendParams,
        }
      )

      return toExternalJSON(response)
    } catch (error) {
      this._client.logger.error('Error sending message', error)
      throw error as MessagingSendError
    }
  }
}

export * from './Message'
export type { MessagingMessageState } from '@signalwire/core'
