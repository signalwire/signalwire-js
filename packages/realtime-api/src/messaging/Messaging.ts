import {
  DisconnectableClientContract,
  BaseComponentOptions,
  toExternalJSON,
  ClientContextContract,
  BaseConsumer,
} from '@signalwire/core'
import { connect } from '@signalwire/core'
import type { MessagingClientApiEvents } from '../types'
import { RealtimeClient } from '../client/index'
import { messagingWorker } from './workers'

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

/** @internal */
export interface Messaging
  extends DisconnectableClientContract<Messaging, MessagingClientApiEvents>,
    ClientContextContract {
  /** @internal */
  _session: RealtimeClient
  /**
   * Disconnects this client. The client will stop receiving events and you will
   * need to create a new instance if you want to use it again.
   *
   * @example
   *
   * ```js
   * client.disconnect()
   * ```
   */
  disconnect(): void

  /**
   * Send an outbound SMS or MMS message.
   *
   * @param params - {@link MessagingSendParams}
   *
   * @returns - {@link MessagingSendResult}
   *
   * @example
   *
   * > Send a message.
   *
   * ```js
   * try {
   *   const sendResult = await client.send({
   *     from: '+1xxx',
   *     to: '+1yyy',
   *     body: 'Hello World!'
   *   })
   *   console.log('Message ID: ', sendResult.messageId)
   * } catch (e) {
   *   console.error(e.message)
   * }
   * ```
   */
  send(params: MessagingSendParams): Promise<MessagingSendResult>
}

/** @internal */
class MessagingAPI extends BaseConsumer<MessagingClientApiEvents> {
  /** @internal */

  constructor(options: BaseComponentOptions) {
    super(options)

    this.runWorker('messagingWorker', {
      worker: messagingWorker,
    })
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

      return toExternalJSON<MessagingSendResult>(response)
    } catch (error) {
      this.logger.error('Error sending message', error)
      throw error as MessagingSendError
    }
  }
}

/** @internal */
export const createMessagingObject = (
  params: BaseComponentOptions
): Messaging => {
  const messaging = connect<MessagingClientApiEvents, MessagingAPI, Messaging>({
    store: params.store,
    Component: MessagingAPI,
  })(params)

  return messaging
}

export * from './MessagingClient'
export * from './Message'
export type { MessagingMessageState } from '@signalwire/core'
