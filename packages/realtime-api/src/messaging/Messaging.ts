import {
  ConsumerContract,
  BaseComponentOptions,
  EventTransform,
  toExternalJSON,
} from '@signalwire/core'
import { connect, BaseComponent } from '@signalwire/core'
import type { RealTimeMessagingApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { messagingWorker } from './workers'
import { MessageContract, Message } from './Message'

interface MessagingSendParams {
  context: string
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

export interface Messaging
  extends ConsumerContract<RealTimeMessagingApiEvents> {
  /** @internal */
  _session: RealtimeClient
  send(params: MessagingSendParams): Promise<any>
}

/** @internal */
class MessagingAPI extends BaseComponent<RealTimeMessagingApiEvents> {
  /** @internal */

  constructor(options: BaseComponentOptions<RealTimeMessagingApiEvents>) {
    super(options)

    this.setWorker('messagingWorker', {
      worker: messagingWorker,
    })
    this.attachWorkers()
    this._attachListeners('')
  }

  /** @internal */
  protected getEmitterTransforms() {
    return new Map<string | string[], EventTransform>([
      [
        [
          'messaging.state',
          'messaging.receive',
          'message.updated',
          'message.received',
        ],
        {
          type: 'messagingMessage',
          instanceFactory: (payload: any) => {
            return new Message(payload)
          },
          payloadTransform: (payload: any): MessageContract => {
            /** Building a MessageContract to conform with our Proxy API */
            const {
              message_id,
              message_state,
              from_number,
              to_number,
              tag,
              ...rest
            } = payload

            return toExternalJSON<MessageContract>({
              ...rest,
              id: message_id,
              state: message_state,
              from: from_number,
              to: to_number,
            })
          },
        },
      ],
    ])
  }

  async send(params: MessagingSendParams): Promise<any> {
    const { from = '', to = '', ...rest } = params
    const sendParams: InternalMessagingSendParams = {
      ...rest,
      from_number: from,
      to_number: to,
    }

    try {
      const response: any = await this.execute({
        method: 'messaging.send',
        params: sendParams,
      })

      return toExternalJSON(response)
    } catch (error) {
      this.logger.error('Error sending message', error.jsonrpc)
      throw error.jsonrpc
    }
  }
}

/** @internal */
export const createMessagingObject = (
  params: BaseComponentOptions<RealTimeMessagingApiEvents>
): Messaging => {
  const messaging = connect<
    RealTimeMessagingApiEvents,
    MessagingAPI,
    Messaging
  >({
    store: params.store,
    Component: MessagingAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
  })(params)

  return messaging
}

export * from './MessagingClient'
export * from './Message'
