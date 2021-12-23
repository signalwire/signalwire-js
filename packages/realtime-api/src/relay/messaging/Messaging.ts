import {
  connect,
  BaseComponent,
  BaseComponentOptions,
  extendComponent,
  OnlyStateProperties,
  OnlyFunctionProperties,
  AssertSameType,
  EventTransform,
  SessionState,
  toExternalJSON,
} from '@signalwire/core'
import * as relayMethods from '../methods'
import { messagingWorker } from './workers'
import { RelayMethods } from '../types'
import { SendResult } from './SendResult'
import { Message, MessageContract } from './Message'

export interface MessagingContract
  extends RelayMethods,
    BaseComponent<BaseMessagingApiEvents> {
  // FIXME: types
  send(params: any): Promise<SendResult>
}
export type MessagingEntity = OnlyStateProperties<MessagingContract>
export type MessagingMethods = OnlyFunctionProperties<MessagingContract>

interface MessagingMain extends MessagingContract {}

// TODO: docs
interface MessagingDocs extends MessagingMain {}

export interface Messaging
  extends AssertSameType<MessagingMain, MessagingDocs> {}

export type BaseMessagingApiEventsHandlerMapping = Record<
  'messaging.state' | 'messaging.receive',
  (message: Message) => void
>

export type BaseMessagingApiEvents<T = BaseMessagingApiEventsHandlerMapping> = {
  [k in keyof T]: T[k]
}

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

export class BaseMessaging extends BaseComponent<BaseMessagingApiEvents> {
  protected getWorkers() {
    return new Map([['messaging', { worker: messagingWorker }]])
  }

  /** @internal */
  protected getEmitterTransforms() {
    /**
     * TODO: implement transforms to return a "Message"
     */
    return new Map<string | string[], EventTransform>([
      [
        ['messaging.state', 'messaging.receive'],
        {
          type: 'relayMessage',
          instanceFactory: (payload: any) => {
            return new Message(payload.params)
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
            } = payload.params

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

  onAuth(session: SessionState) {
    if (session.authStatus === 'authorized') {
      this._attachListeners('')
      this.attachWorkers()
      this.applyEmitterTransforms()
    }
  }

  async send(params: MessagingSendParams): Promise<SendResult> {
    const { from = '', to = '', ...rest } = params
    const sendParams: InternalMessagingSendParams = {
      ...rest,
      from_number: from,
      to_number: to,
    }
    const response: any = await this.execute({
      method: 'messaging.send',
      params: sendParams,
    }).catch((error) => {
      /**
       * Return the jsonrpc response with code/message
       */
      return error.jsonrpc
    })

    return new SendResult(response)
  }
}

export const BaseMessagingAPI = extendComponent<BaseMessaging, RelayMethods>(
  BaseMessaging,
  {
    receive: relayMethods.receive,
    unreceive: relayMethods.unreceive,
  }
)

export const createMessagingObject = <MessagingType>(
  params: BaseComponentOptions<BaseMessagingApiEvents>
) => {
  const messaging = connect<
    BaseMessagingApiEvents,
    BaseMessaging,
    MessagingType
  >({
    store: params.store,
    Component: BaseMessagingAPI,
    componentListeners: {
      errors: 'onError',
      responses: 'onSuccess',
    },
    sessionListeners: {
      authStatus: 'onAuth',
    },
  })(params)

  return messaging
}
